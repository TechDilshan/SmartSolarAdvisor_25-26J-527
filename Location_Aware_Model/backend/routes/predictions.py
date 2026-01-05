from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import db
from models.prediction import Prediction
from ml_models.predictor import SolarPredictor
from utills.helpers import calculate_roi
from utills.energy_calculator import calculate_monthly_energy_physics, compute_shading
from utills.carbon_footprint import calculate_carbon_savings, calculate_lifetime_carbon_savings
from datetime import datetime
import logging

predictions_bp = Blueprint('predictions', __name__)
predictor = SolarPredictor()

@predictions_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields (year and month are now optional, will use defaults)
        required_fields = [
            'latitude', 'longitude',
            'tilt_deg', 'azimuth_deg', 'installed_capacity_kw',
            'panel_efficiency', 'system_loss', 'shading_factor'
        ]
        
        # Set default year and month if not provided
        if 'year' not in data:
            data['year'] = datetime.now().year
        if 'month' not in data:
            data['month'] = datetime.now().month
        
        # Convert uppercase weather fields to lowercase (model expects lowercase)
        # Handle both uppercase and lowercase input
        weather_mapping = {
            'ALLSKY_SFC_SW_DWN': 'allsky_sfc_sw_dwn',
            'allsky_sfc_sw_dwn': 'allsky_sfc_sw_dwn',
            'RH2M': 'rh2m',
            'rh2m': 'rh2m',
            'T2M': 't2m',
            't2m': 't2m',
            'WS2M': 'ws2m',
            'ws2m': 'ws2m'
        }
        
        # Convert weather fields to lowercase
        for upper_key, lower_key in weather_mapping.items():
            if upper_key in data and upper_key != lower_key:
                data[lower_key] = data.pop(upper_key)
        
        # Set default weather values if not provided (using lowercase keys)
        if 'allsky_sfc_sw_dwn' not in data:
            data['allsky_sfc_sw_dwn'] = 5.0
        if 'rh2m' not in data:
            data['rh2m'] = 75.0
        if 't2m' not in data:
            data['t2m'] = 27.0
        if 'ws2m' not in data:
            data['ws2m'] = 3.5
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        # Validate coordinates
        lat = data.get('latitude')
        lon = data.get('longitude')
        if lat is None or lon is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        try:
            lat = float(lat)
            lon = float(lon)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid coordinate format. Please enter valid numeric values.'}), 400
        
        if not (-90 <= lat <= 90):
            return jsonify({'error': f'Latitude must be between -90 and 90. Got: {lat}'}), 400
        if not (-180 <= lon <= 180):
            return jsonify({'error': f'Longitude must be between -180 and 180. Got: {lon}'}), 400
        
        # Update data with validated coordinates
        data['latitude'] = lat
        data['longitude'] = lon
        
        # Make prediction using physics-based calculation (more accurate)
        # Use the specified formula: energy = irradiance * days * capacity * efficiency * (1-loss) * shading
        monthly_energy_physics = calculate_monthly_energy_physics(data)
        
        # Also get ML prediction for comparison/confidence
        try:
            ml_result = predictor.predict(data)
            ml_energy = ml_result['predicted_energy_kwh']
            # Use physics-based as primary, ML for confidence adjustment
            monthly_energy = monthly_energy_physics
            confidence_score = ml_result.get('confidence_score', 0.85)
        except Exception as ml_error:
            # Fallback to physics-based only
            logging.warning(f"ML prediction failed, using physics-based: {str(ml_error)}")
            monthly_energy = monthly_energy_physics
            confidence_score = 0.80
        
        annual_energy = monthly_energy * 12
        
        # Updated electricity rates for Sri Lanka 2025
        ELECTRICITY_RATES = {
            'residential': 35.0,   # LKR/kWh, 2025 average (30-40 range)
            'commercial': 50.0,    # LKR/kWh, 2025 average (45-55 range)
            'industrial': 30.0     # LKR/kWh, 2025 average (28-35 range)
        }

        user_type = data.get('user_type', 'residential')
        electricity_rate_lkr = data.get('electricity_rate', ELECTRICITY_RATES.get(user_type, 35.0))

        # System cost per kW - 225,000 LKR is accurate for 2025 (range: 170,000-280,000)
        system_cost_per_kw_lkr = data.get('system_cost_per_kw', 225000)
        system_cost_lkr = data['installed_capacity_kw'] * system_cost_per_kw_lkr
        
        # Calculate savings and ROI in LKR
        monthly_savings_lkr = monthly_energy * electricity_rate_lkr
        annual_savings_lkr = annual_energy * electricity_rate_lkr
        
        # Simple ROI calculation
        if system_cost_lkr > 0:
            roi_percentage = (annual_savings_lkr / system_cost_lkr) * 100
            payback_period = system_cost_lkr / annual_savings_lkr if annual_savings_lkr > 0 else None
        else:
            roi_percentage = 0
            payback_period = None
        
        # Save prediction to database (store in LKR, but column names keep _usd for compatibility)
        prediction = Prediction(
            user_id=user_id,
            latitude=data['latitude'],
            longitude=data['longitude'],
            year=data['year'],
            month=data['month'],
            tilt_deg=data['tilt_deg'],
            azimuth_deg=data['azimuth_deg'],
            installed_capacity_kw=data['installed_capacity_kw'],
            panel_efficiency=data['panel_efficiency'],
            system_loss=data['system_loss'],
            shading_factor=data.get('shading_factor') or compute_shading(data.get('rh2m') or data.get('RH2M', 75.0)),
            predicted_energy_kwh=monthly_energy,
            confidence_score=confidence_score,
            estimated_cost_usd=system_cost_lkr,  # Stored as LKR but column name is _usd
            monthly_savings_usd=monthly_savings_lkr,  # Stored as LKR
            annual_savings_usd=annual_savings_lkr,  # Stored as LKR
            roi_percentage=roi_percentage,
            payback_period_years=payback_period,
            scenario_name=data.get('scenario_name')
        )
        
        db.session.add(prediction)
        db.session.commit()
        
        # Calculate carbon footprint savings
        carbon_monthly = calculate_carbon_savings(monthly_energy, country='LK')
        carbon_annual = calculate_carbon_savings(annual_energy, country='LK')
        carbon_lifetime = calculate_lifetime_carbon_savings(annual_energy)
        
        return jsonify({
            'prediction': prediction.to_dict(),
            'details': {
                'predicted_energy_kwh': monthly_energy,
                'confidence_score': confidence_score,
                'calculation_method': 'physics-based'
            },
            'financial': {
                'system_cost_lkr': system_cost_lkr,
                'monthly_savings_lkr': monthly_savings_lkr,
                'annual_savings_lkr': annual_savings_lkr,
                'roi_percentage': roi_percentage,
                'payback_period_years': payback_period,
                'electricity_rate_lkr': electricity_rate_lkr
            },
            'carbon_footprint': {
                'monthly': carbon_monthly,
                'annual': carbon_annual,
                'lifetime': carbon_lifetime
            }
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@predictions_bp.route('/predict/annual', methods=['POST'])
@jwt_required()
def predict_annual():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Set default year if not provided
        if 'year' not in data:
            data['year'] = datetime.now().year
        
        # Convert uppercase weather fields to lowercase (model expects lowercase)
        weather_mapping = {
            'ALLSKY_SFC_SW_DWN': 'allsky_sfc_sw_dwn',
            'allsky_sfc_sw_dwn': 'allsky_sfc_sw_dwn',
            'RH2M': 'rh2m',
            'rh2m': 'rh2m',
            'T2M': 't2m',
            't2m': 't2m',
            'WS2M': 'ws2m',
            'ws2m': 'ws2m'
        }
        
        # Convert weather fields to lowercase
        for upper_key, lower_key in weather_mapping.items():
            if upper_key in data and upper_key != lower_key:
                data[lower_key] = data.pop(upper_key)
        
        # Set default weather values if not provided
        if 'allsky_sfc_sw_dwn' not in data:
            data['allsky_sfc_sw_dwn'] = 5.0
        if 'rh2m' not in data:
            data['rh2m'] = 75.0
        if 't2m' not in data:
            data['t2m'] = 27.0
        if 'ws2m' not in data:
            data['ws2m'] = 3.5
        
        # Validate coordinates
        lat = data.get('latitude')
        lon = data.get('longitude')
        if lat is None or lon is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        try:
            lat = float(lat)
            lon = float(lon)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid coordinate format. Please enter valid numeric values.'}), 400
        
        if not (-90 <= lat <= 90):
            return jsonify({'error': f'Latitude must be between -90 and 90. Got: {lat}'}), 400
        if not (-180 <= lon <= 180):
            return jsonify({'error': f'Longitude must be between -180 and 180. Got: {lon}'}), 400
        
        data['latitude'] = lat
        data['longitude'] = lon
        
        # Make annual prediction using physics-based calculation
        monthly_predictions = []
        total_annual_energy = 0
        
        for month in range(1, 13):
            monthly_data = data.copy()
            monthly_data['month'] = month
            monthly_energy = calculate_monthly_energy_physics(monthly_data)
            monthly_predictions.append({
                'month': month,
                'predicted_energy_kwh': monthly_energy,
                'confidence_score': 0.85
            })
            total_annual_energy += monthly_energy
        
        # Calculate financial metrics in LKR - Updated for 2025
        electricity_rate_lkr = data.get('electricity_rate', 35.0)  # LKR/kWh (2025 residential average)
        system_cost_per_kw_lkr = data.get('system_cost_per_kw', 225000)  # LKR/kW (2025 average)
        system_cost_lkr = data['installed_capacity_kw'] * system_cost_per_kw_lkr
        annual_savings_lkr = total_annual_energy * electricity_rate_lkr
        monthly_savings_avg_lkr = annual_savings_lkr / 12
        
        # Calculate ROI
        if system_cost_lkr > 0:
            roi_percentage = (annual_savings_lkr / system_cost_lkr) * 100
            payback_period = system_cost_lkr / annual_savings_lkr if annual_savings_lkr > 0 else None
        else:
            roi_percentage = 0
            payback_period = None
        
        # Save all monthly predictions with financial data
        saved_predictions = []
        for monthly in monthly_predictions:
            monthly_savings_lkr = monthly['predicted_energy_kwh'] * electricity_rate_lkr
            shading_factor = data.get('shading_factor') or compute_shading(data.get('rh2m') or data.get('RH2M', 75.0))
            prediction = Prediction(
                user_id=user_id,
                latitude=data['latitude'],
                longitude=data['longitude'],
                year=data['year'],
                month=monthly['month'],
                tilt_deg=data['tilt_deg'],
                azimuth_deg=data['azimuth_deg'],
                installed_capacity_kw=data['installed_capacity_kw'],
                panel_efficiency=data['panel_efficiency'],
                system_loss=data['system_loss'],
                shading_factor=shading_factor,
                predicted_energy_kwh=monthly['predicted_energy_kwh'],
                confidence_score=monthly['confidence_score'],
                estimated_cost_usd=system_cost_lkr,  # Stored as LKR
                monthly_savings_usd=monthly_savings_lkr,  # Stored as LKR
                annual_savings_usd=annual_savings_lkr,  # Stored as LKR
                roi_percentage=roi_percentage,
                payback_period_years=payback_period,
                scenario_name=data.get('scenario_name')
            )
            db.session.add(prediction)
            saved_predictions.append(prediction)
        
        db.session.commit()
        
        # Calculate carbon footprint for annual prediction
        carbon_annual = calculate_carbon_savings(total_annual_energy, country='LK')
        carbon_lifetime = calculate_lifetime_carbon_savings(total_annual_energy)
        
        return jsonify({
            'predictions': [p.to_dict() for p in saved_predictions],
            'summary': {
                'total_annual_energy_kwh': total_annual_energy,
                'average_confidence': 0.85,
                'system_cost_lkr': system_cost_lkr,
                'annual_savings_lkr': annual_savings_lkr,
                'monthly_savings_lkr': monthly_savings_avg_lkr,
                'roi_percentage': roi_percentage,
                'payback_period_years': payback_period,
                'electricity_rate_lkr': electricity_rate_lkr
            },
            'carbon_footprint': {
                'annual': carbon_annual,
                'lifetime': carbon_lifetime
            }
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@predictions_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    try:
        user_id = get_jwt_identity()
        
        if not user_id:
            return jsonify({'error': 'Invalid user ID'}), 401
        
        predictions = Prediction.query.filter_by(user_id=user_id).order_by(
            Prediction.created_at.desc()
        ).all()
        
        return jsonify({
            'predictions': [p.to_dict() for p in predictions]
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@predictions_bp.route('/history/<int:prediction_id>', methods=['DELETE'])
@jwt_required()
def delete_prediction(prediction_id):
    try:
        user_id = get_jwt_identity()
        prediction = Prediction.query.filter_by(
            id=prediction_id,
            user_id=user_id
        ).first()
        
        if not prediction:
            return jsonify({'error': 'Prediction not found'}), 404
        
        db.session.delete(prediction)
        db.session.commit()
        
        return jsonify({'message': 'Prediction deleted successfully'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@predictions_bp.route('/admin/<int:prediction_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_prediction(prediction_id):
    user_id = get_jwt_identity()

    # check admin
    from models.user import User
    admin = User.query.get(user_id)
    if not admin or not admin.is_admin:
        return jsonify({'error': 'Admin access required'}), 403

    prediction = Prediction.query.get(prediction_id)
    if not prediction:
        return jsonify({'error': 'Prediction not found'}), 404

    db.session.delete(prediction)
    db.session.commit()

    return jsonify({'message': 'Prediction deleted by admin'}), 200

@predictions_bp.route('/compare', methods=['POST'])
@jwt_required()
def compare_predictions():
    """
    Compare multiple predictions/scenarios
    Expects JSON with array of prediction IDs or prediction data
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        prediction_ids = data.get('prediction_ids', [])
        predictions_data = []
        
        # Fetch predictions by IDs
        if prediction_ids:
            predictions = Prediction.query.filter(
                Prediction.id.in_(prediction_ids),
                Prediction.user_id == user_id
            ).all()
            
            for pred in predictions:
                pred_dict = pred.to_dict()
                # Add carbon footprint
                monthly_carbon = calculate_carbon_savings(pred.predicted_energy_kwh, country='LK')
                annual_carbon = calculate_carbon_savings(pred.predicted_energy_kwh * 12, country='LK')
                pred_dict['carbon_footprint'] = {
                    'monthly': monthly_carbon,
                    'annual': annual_carbon
                }
                predictions_data.append(pred_dict)
        else:
            return jsonify({'error': 'No prediction IDs provided'}), 400
        
        if not predictions_data:
            return jsonify({'error': 'No predictions found'}), 404
        
        # Calculate comparison metrics
        best_energy = max(p['predicted_energy_kwh'] for p in predictions_data)
        best_savings = max(p.get('monthly_savings_usd', 0) or 0 for p in predictions_data)
        best_roi = max(p.get('roi_percentage', 0) or 0 for p in predictions_data)
        
        comparison = {
            'predictions': predictions_data,
            'summary': {
                'total_scenarios': len(predictions_data),
                'best_energy_kwh': best_energy,
                'best_monthly_savings_lkr': best_savings,
                'best_roi_percentage': best_roi,
                'average_energy_kwh': sum(p['predicted_energy_kwh'] for p in predictions_data) / len(predictions_data),
                'average_savings_lkr': sum(p.get('monthly_savings_usd', 0) or 0 for p in predictions_data) / len(predictions_data)
            }
        }
        
        return jsonify(comparison), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@predictions_bp.route('/recommendations', methods=['POST'])
@jwt_required()
def get_recommendations():
    """
    Get system recommendations based on prediction results
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        prediction_id = data.get('prediction_id')
        if prediction_id:
            prediction = Prediction.query.filter_by(
                id=prediction_id,
                user_id=user_id
            ).first()
        else:
            # Use latest prediction
            prediction = Prediction.query.filter_by(
                user_id=user_id
            ).order_by(Prediction.created_at.desc()).first()
        
        if not prediction:
            return jsonify({'error': 'No prediction found'}), 404
        
        recommendations = []
        
        # ROI-based recommendations
        if prediction.roi_percentage:
            if prediction.roi_percentage > 15:
                recommendations.append({
                    'type': 'financial',
                    'priority': 'high',
                    'title': 'Excellent ROI',
                    'message': f'Your system shows a {prediction.roi_percentage:.1f}% ROI, which is excellent. Consider proceeding with installation.',
                    'action': 'proceed'
                })
            elif prediction.roi_percentage > 10:
                recommendations.append({
                    'type': 'financial',
                    'priority': 'medium',
                    'title': 'Good ROI',
                    'message': f'Your system shows a {prediction.roi_percentage:.1f}% ROI. The investment is viable.',
                    'action': 'consider'
                })
            else:
                recommendations.append({
                    'type': 'financial',
                    'priority': 'low',
                    'title': 'Low ROI',
                    'message': f'Your system shows a {prediction.roi_percentage:.1f}% ROI. Consider optimizing system parameters or waiting for better rates.',
                    'action': 'optimize'
                })
        
        # Payback period recommendations
        if prediction.payback_period_years:
            if prediction.payback_period_years < 5:
                recommendations.append({
                    'type': 'financial',
                    'priority': 'high',
                    'title': 'Quick Payback',
                    'message': f'Payback period of {prediction.payback_period_years:.1f} years is excellent.',
                    'action': 'proceed'
                })
            elif prediction.payback_period_years > 10:
                recommendations.append({
                    'type': 'financial',
                    'priority': 'medium',
                    'title': 'Long Payback Period',
                    'message': f'Payback period of {prediction.payback_period_years:.1f} years is longer than ideal. Consider system optimization.',
                    'action': 'optimize'
                })
        
        # System optimization recommendations
        if prediction.tilt_deg < 15 or prediction.tilt_deg > 35:
            recommendations.append({
                'type': 'technical',
                'priority': 'medium',
                'title': 'Tilt Angle Optimization',
                'message': f'Current tilt angle is {prediction.tilt_deg:.1f}°. Optimal range for Sri Lanka is 15-30°. Consider adjusting.',
                'action': 'adjust_tilt'
            })
        
        if prediction.shading_factor < 0.85:
            recommendations.append({
                'type': 'technical',
                'priority': 'high',
                'title': 'Shading Issue',
                'message': f'Shading factor is {prediction.shading_factor:.3f}, indicating significant shading. Consider removing obstructions.',
                'action': 'reduce_shading'
            })
        
        # Capacity recommendations
        monthly_energy = prediction.predicted_energy_kwh
        if monthly_energy < 100:
            recommendations.append({
                'type': 'capacity',
                'priority': 'medium',
                'title': 'Low Energy Output',
                'message': f'Monthly output of {monthly_energy:.1f} kWh is low. Consider increasing system capacity.',
                'action': 'increase_capacity'
            })
        
        return jsonify({
            'prediction_id': prediction.id,
            'recommendations': recommendations,
            'total_recommendations': len(recommendations)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
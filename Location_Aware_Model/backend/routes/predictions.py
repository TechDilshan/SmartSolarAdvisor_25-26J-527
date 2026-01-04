from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import db
from models.prediction import Prediction
from ml_models.predictor import SolarPredictor
from utills.helpers import calculate_roi
from utills.energy_calculator import calculate_monthly_energy_physics, compute_shading
from datetime import datetime

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
        except:
            # Fallback to physics-based only
            monthly_energy = monthly_energy_physics
            confidence_score = 0.80
        
        annual_energy = monthly_energy * 12
        
        # Default values in LKR (Sri Lankan Rupees) - Updated for 2024
        # Based on actual Sri Lankan market rates
        electricity_rate_lkr = data.get('electricity_rate', 23.38)  # LKR/kWh (Sri Lanka average residential rate 2024)
        system_cost_per_kw_lkr = data.get('system_cost_per_kw', 225000)  # LKR/kW (Sri Lanka average solar installation cost)
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
        
        # Calculate financial metrics in LKR - Updated for 2024
        electricity_rate_lkr = data.get('electricity_rate', 23.38)  # LKR/kWh (Sri Lanka average residential rate)
        system_cost_per_kw_lkr = data.get('system_cost_per_kw', 225000)  # LKR/kW (Sri Lanka average solar installation cost)
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

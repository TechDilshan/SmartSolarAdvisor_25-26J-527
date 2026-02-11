from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.prediction import Prediction

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Get current user's profile with statistics
    """
    try:
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user statistics
        stats = Prediction.get_user_statistics(user_id)
        
        return jsonify({
            'user': user.to_dict(),
            'statistics': {
                'total_predictions': stats['total_predictions'],
                'average_energy_kwh': stats['average_energy_kwh'],
                'average_confidence': stats['average_confidence'],
                'total_potential_savings_lkr': stats['total_potential_savings_lkr']
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/update', methods=['PATCH'])
@jwt_required()
def update_profile():
    """
    Update user profile (email only, username cannot be changed)
    """
    try:
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update email if provided
        if 'email' in data:
            email = data['email'].strip()
            
            # Validate email format (basic)
            if '@' not in email or '.' not in email:
                return jsonify({'error': 'Invalid email format'}), 400
            
            # Check if email already exists
            existing_user = User.find_by_email(email)
            if existing_user and str(existing_user.id) != str(user_id):
                return jsonify({'error': 'Email already in use'}), 400
            
            user.email = email
        
        user.save()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Change user password
    """
    try:
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if not data.get('current_password'):
            return jsonify({'error': 'Current password is required'}), 400
        
        if not data.get('new_password'):
            return jsonify({'error': 'New password is required'}), 400
        
        # Verify current password
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password length
        if len(data['new_password']) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        # Update password
        user.set_password(data['new_password'])
        user.save()
        
        return jsonify({'message': 'Password changed successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


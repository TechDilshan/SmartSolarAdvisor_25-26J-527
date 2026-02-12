from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from models.user import User
from models.prediction import Prediction

admin_bp = Blueprint('admin', __name__)

def admin_required():
    """Check if user is admin"""
    def wrapper(fn):
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            if not claims.get('is_admin'):
                return jsonify({'error': 'Admin access required'}), 403
            return fn(*args, **kwargs)
        decorator.__name__ = fn.__name__
        return decorator
    return wrapper

@admin_bp.route('/users', methods=['GET'])
@admin_required()
def get_all_users():
    """Retrieve all registered users"""
    try:
        users = User.find_all()
        return jsonify({
            'users': [user.to_dict() for user in users]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<string:user_id>', methods=['DELETE'])
@admin_required()
def delete_user(user_id):
    """Delete user accounts"""
    try:
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
    
        current_user_id = get_jwt_identity()
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        user.delete()
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/predictions', methods=['GET'])
@admin_required()
def get_all_predictions():
    """Retrieve recent predictions for monitoring"""
    try:
        predictions = Prediction.find_recent(limit=1000)
        
        return jsonify({
            'predictions': [p.to_dict() for p in predictions]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/predictions/<string:prediction_id>', methods=['DELETE'])
@admin_required()
def delete_prediction(prediction_id):
    """Delete a prediction by ID (admin only)."""
    try:
        prediction = Prediction.find_by_id(prediction_id)
        if not prediction:
            return jsonify({'error': 'Prediction not found'}), 404

        prediction.delete()
        return jsonify({'message': 'Prediction deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/statistics', methods=['GET'])
@admin_required()
def get_statistics():
    try:
        stats = Prediction.get_statistics()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/toggle-admin', methods=['PATCH'])
@admin_required()
def toggle_admin(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Cannot modify own admin status
        current_user_id = get_jwt_identity()
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot modify your own admin status'}), 400
        
        user.is_admin = not user.is_admin
        db.session.commit()
        
        return jsonify({
            'message': 'Admin status updated',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
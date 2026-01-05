from flask import Blueprint, send_file, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.prediction import Prediction
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
import io
from datetime import datetime

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("/prediction/<int:prediction_id>/pdf", methods=["GET"])
@jwt_required()
def generate_prediction_pdf(prediction_id):

    user_id = get_jwt_identity()

    prediction = Prediction.query.filter_by(
        id=prediction_id,
        user_id=user_id
    ).first()

    if not prediction:
        return jsonify({"error": "Prediction not found"}), 404

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(2 * cm, height - 2 * cm, "Solar Energy Prediction Report")

    pdf.setFont("Helvetica", 11)
    pdf.drawString(
        2 * cm,
        height - 3 * cm,
        f"Generated on: {datetime.now().strftime('%Y-%m-%d')}"
    )

    y = height - 5 * cm

    def draw(label, value):
        nonlocal y
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(2 * cm, y, label)
        pdf.setFont("Helvetica", 10)
        pdf.drawString(8 * cm, y, str(value))
        y -= 0.6 * cm

    draw("Latitude", prediction.latitude)
    draw("Longitude", prediction.longitude)
    draw("Month / Year", f"{prediction.month}/{prediction.year}")
    draw("Energy (kWh)", f"{prediction.predicted_energy_kwh:.2f}")
    draw("Confidence", f"{prediction.confidence_score * 100:.1f}%")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"solar_prediction_{prediction.id}.pdf"
    )

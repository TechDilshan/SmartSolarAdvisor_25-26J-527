from flask import Blueprint, send_file, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.prediction import Prediction
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import cm
from reportlab.lib import colors
import io
from datetime import datetime
import calendar
from bson import ObjectId

reports_bp = Blueprint("reports", __name__)

def format_currency_lkr(amount):
    """Format amount as LKR currency"""
    if amount is None:
        return "N/A"
    return f"LKR {amount:,.2f}"

def get_month_name(month_num):
    """Get month name from number"""
    if 1 <= month_num <= 12:
        return calendar.month_name[month_num]
    return "Unknown"

def to_float(value, default=0.0):
    """Safely convert values (including strings/None) to float for formatting."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

# Monthly PDF Report Generation
@reports_bp.route("/prediction/<prediction_id>/pdf", methods=["GET"])
@jwt_required()
def generate_prediction_pdf(prediction_id):
    """Generate safe monthly prediction PDF report"""
    user_id = get_jwt_identity()

    # Get Mongo collection
    col = Prediction._collection()
    if col is None:
        return jsonify({"error": "Database not initialized"}), 500

    # Convert IDs safely
    try:
        obj_id = ObjectId(prediction_id)
    except Exception:
        return jsonify({"error": "Invalid prediction ID"}), 400

    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 400

    prediction = col.find_one({
        "_id":   obj_id,
        "user_id": user_obj_id,
    })

    if not prediction:
        return jsonify({"error": "Prediction not found"}), 404

    # Safe conversions
    def to_float_safe(val, default=0.0):
        try:
            return float(val)
        except (TypeError, ValueError):
            return default

    def format_percent(val):
        try:
            return f"{float(val)*100:.1f}%"
        except:
            return "N/A"

    def format_currency(val):
        try:
            return f"LKR {float(val):,.2f}"
        except:
            return "N/A"

    # Document setup
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    elements = []
    styles = getSampleStyleSheet()

    # Title
    month_num = int(to_float_safe(prediction.get('month'), 1))
    year_val = prediction.get('year', '')
    title_style = styles['Heading1']
    title_style.alignment = TA_CENTER
    elements.append(Paragraph(
        f"<b>Monthly Solar Energy Prediction Report - {get_month_name(month_num)} {year_val}</b>",
        title_style
    ))
    elements.append(Spacer(1, 0.3*cm))

    # Generated on
    subtitle_style = styles['Normal']
    subtitle_style.alignment = TA_CENTER
    elements.append(Paragraph(
        f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        subtitle_style
    ))
    elements.append(Spacer(1, 0.3*cm))

    # Summary Table
    summary_data = [
        ['Metric', 'Value'],
        ['Predicted Energy Output', f"{to_float_safe(prediction.get('predicted_energy_kwh')):.2f} kWh"],
        ['Confidence Score', format_percent(prediction.get('confidence_score'))],
        ['Monthly Savings', format_currency(prediction.get('monthly_savings_usd'))],
        ['Annual Savings', format_currency(prediction.get('annual_savings_usd'))],
        ['System Cost', format_currency(prediction.get('estimated_cost_usd'))],
        ['ROI', f"{to_float_safe(prediction.get('roi_percentage'), 0.0):.2f}%"],
        ['Payback Period', f"{to_float_safe(prediction.get('payback_period_years'), 0.0):.2f} years"]
    ]

    summary_table = Table(summary_data, colWidths=[9*cm, 7*cm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.5*cm))

    # Location & System Table
    location_data = [
        ['Parameter', 'Value'],
        ['Latitude', f"{to_float_safe(prediction.get('latitude')):.6f}°"],
        ['Longitude', f"{to_float_safe(prediction.get('longitude')):.6f}°"],
        ['Month', f"{get_month_name(month_num)} {year_val}"],
        ['Roof Tilt Angle', f"{to_float_safe(prediction.get('tilt_deg')):.1f}°"],
        ['Azimuth Angle', f"{to_float_safe(prediction.get('azimuth_deg')):.1f}°"],
        ['Installed Capacity', f"{to_float_safe(prediction.get('installed_capacity_kw')):.2f} kW"],
        ['Panel Efficiency', f"{to_float_safe(prediction.get('panel_efficiency'))*100:.1f}%"],
        ['System Loss', f"{to_float_safe(prediction.get('system_loss'))*100:.1f}%"],
        ['Shading Factor', f"{to_float_safe(prediction.get('shading_factor'), 1.0):.3f}"]
    ]
    if prediction.get('scenario_name'):
        location_data.append(['Scenario Name', prediction.get('scenario_name')])

    location_table = Table(location_data, colWidths=[9*cm, 7*cm])
    location_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#388e3c')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    elements.append(location_table)
    elements.append(Spacer(1, 0.5*cm))

    # Footer
    footer = Paragraph(
        "<b>Smart Solar Advisor</b> - IoT-Enabled Hybrid ML for Location-Aware Solar Prediction",
        styles['Normal']
    )
    elements.append(Spacer(1, 1*cm))
    elements.append(footer)

    # Build PDF safely
    try:
        doc.build(elements)
        buffer.seek(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    filename = f"solar_prediction_{get_month_name(month_num)}_{year_val}_{str(prediction.get('_id'))}.pdf"
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=filename)



# Annual PDF Report Generation
@reports_bp.route("/prediction/annual/<int:year>/pdf", methods=["GET"])
@jwt_required()
def generate_annual_prediction_pdf(year):
    """Generate comprehensive annual prediction PDF report with all 12 months"""
    user_id = get_jwt_identity()

    # Get Mongo collection
    col = Prediction._collection()
    if col is None:
        return jsonify({"error": "Database not initialized"}), 500

    # Convert user id safely
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 400
    
    # Get query parameters
    latitude = request.args.get('latitude', type=float)
    longitude = request.args.get('longitude', type=float)
    
    # Build query
    filter_query = {"user_id": user_obj_id, "year": year}
    if latitude is not None and longitude is not None:
        filter_query["latitude"] = latitude
        filter_query["longitude"] = longitude

    all_predictions = list(col.find(filter_query).sort("month", 1))

    if not all_predictions:
        return jsonify({"error": "No predictions found for the specified year and location"}), 404
    
    # Group predictions by month and take only the latest prediction for each month
    monthly_predictions = {}
    for pred in all_predictions:
        month_key = pred.get("month")
        if month_key not in monthly_predictions:
            monthly_predictions[month_key] = pred
        else:
            # Keep the most recent prediction
            if pred.get("created_at") > monthly_predictions[month_key].get("created_at"):
                monthly_predictions[month_key] = pred
    
    # Sort predictions by month
    predictions = [monthly_predictions[month] for month in sorted(monthly_predictions.keys())]
    
    if not predictions:
        return jsonify({"error": "No valid predictions found"}), 404
    
    # Create PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                           rightMargin=2*cm, leftMargin=2*cm,
                           topMargin=2*cm, bottomMargin=2*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1a237e'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph("Annual Solar Energy Prediction Report", title_style))
    elements.append(Spacer(1, 0.3*cm))
    
    # Subtitle
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#424242'),
        alignment=TA_CENTER,
        spaceAfter=4
    )
    elements.append(Paragraph(f"<b>Year {year} - Complete Analysis</b>", subtitle_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", subtitle_style))
    elements.append(Spacer(1, 0.6*cm))
    
    # Calculate totals (safe against None / string values)
    num_months = len(predictions)
    total_annual_energy = sum(to_float(p.get("predicted_energy_kwh"), 0.0) for p in predictions)
    avg_monthly_energy = total_annual_energy / num_months if num_months > 0 else 0.0
    avg_confidence = (
        sum(to_float(p.get("confidence_score"), 0.0) for p in predictions) / num_months
        if num_months > 0 else 0.0
    )
    
    # Get first prediction for location/system details
    first_pred = predictions[0]
    total_system_cost = to_float(first_pred.get("estimated_cost_usd"), 0.0)
    total_annual_savings = sum(to_float(p.get("monthly_savings_usd"), 0.0) for p in predictions)
    avg_monthly_savings = total_annual_savings / num_months if num_months > 0 else 0.0
    
    # Summary
    summary_style = ParagraphStyle(
        'SummaryStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1976d2'),
        spaceAfter=4,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph("Summary", summary_style))
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Annual Energy Output', f"{total_annual_energy:.2f} kWh"],
        ['Average Monthly Energy', f"{avg_monthly_energy:.2f} kWh"],
        ['Number of Months', f"{num_months} months"],
        ['Average Confidence Score', f"{avg_confidence * 100:.1f}%"],
        ['Total Annual Savings', format_currency_lkr(total_annual_savings)],
        ['Average Monthly Savings', format_currency_lkr(avg_monthly_savings)],
        ['System Installation Cost', format_currency_lkr(total_system_cost)],
    ]
    
    # Safely get ROI and payback period
    roi_value = to_float(first_pred.get('roi_percentage'), default=None)
    payback_value = to_float(first_pred.get('payback_period_years'), default=None)
    
    if roi_value is not None:
        summary_data.append(['Return on Investment (ROI)', f"{roi_value:.2f}%"])
    if payback_value is not None:
        summary_data.append(['Payback Period', f"{payback_value:.2f} years"])
    
    summary_table = Table(summary_data, colWidths=[9*cm, 7*cm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # Location & System Details
    elements.append(Paragraph("Location & System Configuration", summary_style))
    
    # Safely format location and system configuration values (handle None / strings)
    avg_shading_factor = (
        (sum(to_float(p.get('shading_factor'), 1.0) for p in predictions) / num_months)
        if num_months > 0 else 1.0
    )

    location_data = [
        ['Parameter', 'Value'],
        ['Latitude', f"{to_float(first_pred.get('latitude'), 0.0):.6f}°"],
        ['Longitude', f"{to_float(first_pred.get('longitude'), 0.0):.6f}°"],
        ['Roof Tilt Angle', f"{to_float(first_pred.get('tilt_deg'), 0.0):.1f}°"],
        ['Azimuth Angle', f"{to_float(first_pred.get('azimuth_deg'), 0.0):.1f}°"],
        ['Installed Capacity', f"{to_float(first_pred.get('installed_capacity_kw'), 0.0):.2f} kW"],
        ['Panel Efficiency', f"{(to_float(first_pred.get('panel_efficiency'), 0.0) * 100):.1f}%"],
        ['System Loss', f"{(to_float(first_pred.get('system_loss'), 0.0) * 100):.1f}%"],
        ['Average Shading Factor', f"{avg_shading_factor:.3f}"]
    ]
    
    location_table = Table(location_data, colWidths=[9*cm, 7*cm])
    location_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#388e3c')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    elements.append(location_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # Monthly Breakdown
    elements.append(Paragraph("Monthly Energy Production Breakdown", summary_style))
    elements.append(Spacer(1, 0.3*cm))
    
    monthly_data = [['Month', 'Energy (kWh)', 'Savings', 'Confidence']]
    
    for pred in predictions:
        month_name = get_month_name(pred.get("month", 0))
        monthly_data.append([
            month_name,
            f"{to_float(pred.get('predicted_energy_kwh'), 0.0):.2f}",
            format_currency_lkr(to_float(pred.get('monthly_savings_usd'), 0.0)),
            f"{(to_float(pred.get('confidence_score'), 0.0) * 100):.1f}%"
        ])
    
    # Add totals row
    monthly_data.append([
        'TOTAL',
        f"{total_annual_energy:.2f}",
        format_currency_lkr(total_annual_savings),
        f"{avg_confidence * 100:.1f}%"
    ])
    
    monthly_table = Table(monthly_data, colWidths=[3.5*cm, 3*cm, 4*cm, 2.5*cm])
    monthly_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d32f2f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#ffa726')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.lightgrey])
    ]))
    elements.append(monthly_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # Financial Analysis
    if total_annual_savings > 0:
        elements.append(Paragraph("Financial Analysis", summary_style))
        
        financial_data = [
            ['Financial Metric', 'Amount'],
            ['System Installation Cost', format_currency_lkr(total_system_cost)],
            ['Total Annual Energy Savings', format_currency_lkr(total_annual_savings)],
            ['Average Monthly Savings', format_currency_lkr(avg_monthly_savings)],
        ]
        
        if roi_value is not None:
            financial_data.append(['Return on Investment (ROI)', f"{roi_value:.2f}%"])
        if payback_value is not None:
            financial_data.append(['Payback Period', f"{payback_value:.2f} years"])
        
        # Calculate best and worst months (safely handle None / strings)
        best_month = max(predictions, key=lambda p: to_float(p.get("predicted_energy_kwh"), 0.0))
        worst_month = min(predictions, key=lambda p: to_float(p.get("predicted_energy_kwh"), 0.0))
        
        financial_data.extend([
            [
                'Best Production Month',
                f"{get_month_name(best_month.get('month', 0))} ({to_float(best_month.get('predicted_energy_kwh'), 0.0):.2f} kWh)"
            ],
            [
                'Lowest Production Month',
                f"{get_month_name(worst_month.get('month', 0))} ({to_float(worst_month.get('predicted_energy_kwh'), 0.0):.2f} kWh)"
            ]
        ])
        
        financial_table = Table(financial_data, colWidths=[9*cm, 7*cm])
        financial_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7b1fa2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        elements.append(financial_table)
    
    # Footer
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=4
    )
    elements.append(Spacer(1, 1.5*cm))
    elements.append(Paragraph("<b>Smart Solar Advisor</b> - IoT-Enabled Hybrid ML for Location-Aware Solar Prediction", footer_style))
    elements.append(Paragraph("Project ID: 25-26J-527 | Generated by Smart Solar Advisor System", footer_style))
    
    # Build PDF
    try:
        doc.build(elements)
        buffer.seek(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
    # Use safe defaults for filename components to avoid TypeError if values are None / strings
    filename = (
        f"annual_solar_report_{year}_"
        f"{to_float(first_pred.get('latitude'), 0.0):.2f}_"
        f"{to_float(first_pred.get('longitude'), 0.0):.2f}.pdf"
    )

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )
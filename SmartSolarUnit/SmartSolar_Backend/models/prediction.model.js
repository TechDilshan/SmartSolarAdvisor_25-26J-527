import admin from 'firebase-admin';

class PredictionModel {
  get db() {
    return admin.database();
  }

  get predictionsRef() {
    return this.db.ref('predicted_units');
  }

  async getPredictions(customerName, siteId) {
    const snapshot = await this.predictionsRef
      .child(customerName)
      .child(siteId)
      .once('value');
    
    const data = snapshot.val();
    
    if (!data) return [];
    
    return Object.entries(data).map(([timestamp, prediction]) => ({
      timestamp,
      ...prediction
    }));
  }

  async getLatestPrediction(customerName, siteId) {
    const snapshot = await this.predictionsRef
      .child(customerName)
      .child(siteId)
      .orderByKey()
      .limitToLast(1)
      .once('value');
    
    const data = snapshot.val();
    
    if (!data) return null;
    
    const timestamp = Object.keys(data)[0];
    return {
      timestamp,
      ...data[timestamp]
    };
  }

  async getPredictionsInRange(customerName, siteId, startDate, endDate) {
    const snapshot = await this.predictionsRef
      .child(customerName)
      .child(siteId)
      .orderByKey()
      .startAt(startDate)
      .endAt(endDate)
      .once('value');
    
    const data = snapshot.val();
    
    if (!data) return [];
    
    return Object.entries(data).map(([timestamp, prediction]) => ({
      timestamp,
      ...prediction
    }));
  }

  async getDailyTotal(customerName, siteId, date) {
    // Date format: YYYYMMDD
    // Timestamp format: YYYYMMDD_HHMMSS
    const dayStart = date + '_000000';
    const dayEnd = date + '_235959';
    
    const predictions = await this.getPredictionsInRange(
      customerName,
      siteId,
      dayStart,
      dayEnd
    );
    
    const totalKwh = predictions.reduce(
      (sum, pred) => sum + (pred.predicted_kwh_5min || 0),
      0
    );
    
    return {
      date,
      totalKwh,
      readingsCount: predictions.length
    };
  }

  async getMonthlyTotal(customerName, siteId, yearMonth) {
    // yearMonth format: YYYYMM
    // Timestamp format: YYYYMMDD_HHMMSS
    const monthStart = yearMonth + '01_000000';
    const monthEnd = yearMonth + '31_235959';
    
    const predictions = await this.getPredictionsInRange(
      customerName,
      siteId,
      monthStart,
      monthEnd
    );
    
    const totalKwh = predictions.reduce(
      (sum, pred) => sum + (pred.predicted_kwh_5min || 0),
      0
    );
    
    return {
      yearMonth,
      totalKwh,
      readingsCount: predictions.length
    };
  }

  subscribeToPredictions(customerName, siteId, callback) {
    const predRef = this.predictionsRef.child(customerName).child(siteId);
    
    predRef.on('child_added', (snapshot) => {
      callback({
        timestamp: snapshot.key,
        ...snapshot.val()
      });
    });

    return () => predRef.off('child_added');
  }
}

export default new PredictionModel();

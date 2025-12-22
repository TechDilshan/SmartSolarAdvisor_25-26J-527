from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import numpy as np

def evaluate(model, X, y):
    preds = model.predict(X)
    return {
        "r2": r2_score(y, preds),
        "mae": mean_absolute_error(y, preds),
        "rmse": np.sqrt(mean_squared_error(y, preds))
    }

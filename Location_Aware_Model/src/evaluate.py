from sklearn.metrics import r2_score, mean_absolute_error

def evaluate(model, X, y):
    preds = model.predict(X)
    return {
        "r2": r2_score(y, preds),
        "mae": mean_absolute_error(y, preds)
    }

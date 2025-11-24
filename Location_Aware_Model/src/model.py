import pickle
from xgboost import XGBRegressor

def train_model(X, y, model_path="models/xgb_model.pkl"):
    model = XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05
    )
    model.fit(X, y)
    pickle.dump(model, open(model_path, "wb"))
    return model


def load_model(path="models/xgb_model.pkl"):
    return pickle.load(open(path, "rb"))

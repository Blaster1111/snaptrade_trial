import json
import requests
from app.config.settings import settings


class PortfolioService:
    @staticmethod
    def get_portfolio_score(portfolio_dict: dict):
        url = f"{settings.PORTFOLIO_PILOT_APIURL}/get_portfolio_score"
        params = {
            "portfolio_dict": json.dumps(portfolio_dict),
            "api_key": settings.PORFTOLIO_PILOT_APIKEY
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def get_portfolio_performance_stats(portfolio_dict: dict):
        url = f"{settings.portfolio_pilot_api_url}/get_portfolio_performance_stats"
        params = {
            "portfolio_dict": json.dumps(portfolio_dict),
            "api_key": settings.portfolio_pilot_api_key
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def get_portfolio_assessment(portfolio_dict: dict, target_risk: str = None):
        url = f"{settings.PORTFOLIO_PILOT_APIURL}/get_portfolio_assessment"
        params = {
            "portfolio_dict": json.dumps(portfolio_dict),
            "api_key": settings.PORFTOLIO_PILOT_APIKEY
        }
        if target_risk:
            params["target_risk"] = target_risk
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def get_portfolio_insights(portfolio_dict: dict):
        url = f"{settings.portfolio_pilot_api_url}/get_portfolio_insights"
        params = {
            "portfolio_dict": json.dumps(portfolio_dict),
            "api_key": settings.portfolio_pilot_api_key
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def get_daily_insights():
        url = f"{settings.portfolio_pilot_api_url}/get_daily_insights"
        params = {
            "api_key": settings.portfolio_pilot_api_key
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

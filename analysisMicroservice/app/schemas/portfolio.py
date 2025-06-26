from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict

class PortfolioDictRequest(BaseModel):
    portfolio_dict: Dict[str, float]  # e.g., {"AAPL": 30, "GOOG": 70}


class PortfolioAssessmentRequest(PortfolioDictRequest):
    target_risk: Optional[str] = None

class PortfolioScore(BaseModel):
    portfolio_score: float  # Can be float (e.g., 505.19)
    score_remark: str
    percentile_rank: float  # Often float like 11.73
    risk_match_score: Optional[float] = None
    sharpe_ratio_score: float
    downside_protection_score: float


class PortfolioPerformanceStats(BaseModel):
    returns: float
    risk: float
    sharpe_ratio: float


class PortfolioAssessment(BaseModel):
    assessment: str


class PortfolioInsight(BaseModel):
    insight: str
    timestamp: str  # You can use datetime if format is strict
    category: str
    url: Optional[HttpUrl]  # Use HttpUrl for valid URLs
    description: str
    tickers: str
    image_url: Optional[HttpUrl]  # Optional in case image is missing

# Alias for daily insights
DailyInsight = PortfolioInsight

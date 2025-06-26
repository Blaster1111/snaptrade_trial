from fastapi import APIRouter
from app.schemas.portfolio import (
    PortfolioScore,
    PortfolioPerformanceStats,
    PortfolioAssessment,
    PortfolioInsight,
    PortfolioDictRequest,
    PortfolioAssessmentRequest,
)
from app.services.portfolio_service import PortfolioService

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.post("/score", response_model=PortfolioScore)
def get_portfolio_score(data: PortfolioDictRequest):
    return PortfolioService.get_portfolio_score(data.portfolio_dict)

@router.post("/performance-stats", response_model=PortfolioPerformanceStats)
def get_portfolio_performance_stats(data: PortfolioDictRequest):
    return PortfolioService.get_portfolio_performance_stats(data.portfolio_dict)

@router.post("/assessment", response_model=PortfolioAssessment)
def get_portfolio_assessment(data: PortfolioAssessmentRequest):
    return PortfolioService.get_portfolio_assessment(data.portfolio_dict, data.target_risk)

@router.post("/insights", response_model=PortfolioInsight)
def get_portfolio_insights(data: PortfolioDictRequest):
    return PortfolioService.get_portfolio_insights(data.portfolio_dict)

@router.get("/daily-insights", response_model=PortfolioInsight)
def get_daily_insights():
    return PortfolioService.get_daily_insights()

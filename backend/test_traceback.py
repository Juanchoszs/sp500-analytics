
from app.providers import get_provider
from app.domain.application.services import MarketAnalyzerService
from datetime import date

if __name__ == "__main__":
    try:
        provider = get_provider()
        expirations = provider.get_expirations("SPY")
        print(f"Expirations: {expirations}")
        chain = provider.get_options_chain("SPY", expirations[0])
        report = MarketAnalyzerService.build_exposure_report(chain, date.today())
        print("Report built successfully")
        print(report)
    except Exception as e:
        import traceback
        traceback.print_exc()


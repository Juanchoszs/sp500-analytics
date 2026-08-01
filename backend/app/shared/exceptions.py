"""
Shared exception classes for the application.
Centralizing exceptions makes error handling consistent across layers.
"""


class BaseApplicationError(Exception):
    """Base exception for application-specific errors."""
    
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class TickerNotFoundError(BaseApplicationError):
    """Raised when a ticker is not found or not supported."""
    
    def __init__(self, ticker: str, details: dict = None):
        message = f"Ticker '{ticker}' not found or not supported"
        super().__init__(message, details)
        self.ticker = ticker


class ExpirationNotFoundError(BaseApplicationError):
    """Raised when an expiration date is not found for a ticker."""
    
    def __init__(self, ticker: str, expiration: str, details: dict = None):
        message = f"Expiration '{expiration}' not found for ticker '{ticker}'"
        super().__init__(message, details)
        self.ticker = ticker
        self.expiration = expiration


class DataProviderError(BaseApplicationError):
    """Raised when a data provider fails to retrieve data."""
    
    def __init__(self, provider_name: str, operation: str, details: dict = None):
        message = f"Data provider '{provider_name}' failed during operation '{operation}'"
        super().__init__(message, details)
        self.provider_name = provider_name
        self.operation = operation


class AnalysisError(BaseApplicationError):
    """Raised when an analysis operation fails."""
    
    def __init__(self, analysis_type: str, message: str, details: dict = None):
        super().__init__(message, details)
        self.analysis_type = analysis_type


class ValidationError(BaseApplicationError):
    """Raised when input validation fails."""
    
    def __init__(self, field: str, value: str, reason: str, details: dict = None):
        message = f"Validation failed for field '{field}' with value '{value}': {reason}"
        super().__init__(message, details)
        self.field = field
        self.value = value
        self.reason = reason


class CacheError(BaseApplicationError):
    """Raised when a cache operation fails."""
    
    def __init__(self, operation: str, key: str, details: dict = None):
        message = f"Cache operation '{operation}' failed for key '{key}'"
        super().__init__(message, details)
        self.operation = operation
        self.key = key


class MappingError(BaseApplicationError):
    """Raised when a mapping operation fails (e.g., domain to DTO)."""
    
    def __init__(self, source_type: str, target_type: str, details: dict = None):
        message = f"Failed to map from '{source_type}' to '{target_type}'"
        super().__init__(message, details)
        self.source_type = source_type
        self.target_type = target_type

"""
Shared helper functions used across the application.
These are utility functions that don't belong to any specific layer.
"""
from datetime import date, datetime
from typing import Optional, Tuple


def calculate_percentage_change(old_value: float, new_value: float) -> float:
    """
    Calculate percentage change between two values.
    
    Args:
        old_value: Original value
        new_value: New value
        
    Returns:
        Percentage change as a float
        
    Raises:
        ValueError: If old_value is zero
    """
    if old_value == 0:
        raise ValueError("Cannot calculate percentage change with zero as old_value")
    return ((new_value - old_value) / old_value) * 100


def format_number(value: float, decimals: int = 2) -> str:
    """
    Format a number with specified decimal places.
    
    Args:
        value: Number to format
        decimals: Number of decimal places
        
    Returns:
        Formatted number as string
    """
    return f"{value:.{decimals}f}"


def format_currency(value: float, symbol: str = "$") -> str:
    """
    Format a value as currency.
    
    Args:
        value: Number to format
        symbol: Currency symbol (default: $)
        
    Returns:
        Formatted currency string
    """
    return f"{symbol}{format_number(value, 2)}"


def validate_date_range(start_date: date, end_date: date) -> bool:
    """
    Validate that a date range is valid (start <= end).
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        True if valid, False otherwise
    """
    return start_date <= end_date


def calculate_years_to_expiry(expiration: date, reference_date: Optional[date] = None) -> float:
    """
    Calculate time to expiry in years.
    
    Args:
        expiration: Expiration date
        reference_date: Reference date (defaults to today)
        
    Returns:
        Time to expiry in years (minimum 0.5 days to avoid division by zero)
    """
    if reference_date is None:
        reference_date = date.today()
    
    days = (expiration - reference_date).days
    return max(days, 0.5) / 365.0


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Safely divide two numbers, returning default if denominator is zero.
    
    Args:
        numerator: Numerator
        denominator: Denominator
        default: Default value to return if denominator is zero
        
    Returns:
        Result of division or default value
    """
    if denominator == 0:
        return default
    return numerator / denominator


def clamp(value: float, min_value: float, max_value: float) -> float:
    """
    Clamp a value between a minimum and maximum.
    
    Args:
        value: Value to clamp
        min_value: Minimum value
        max_value: Maximum value
        
    Returns:
        Clamped value
    """
    return max(min_value, min(value, max_value))


def parse_date_string(date_string: str, format: str = "%Y-%m-%d") -> date:
    """
    Parse a date string into a date object.
    
    Args:
        date_string: Date string to parse
        format: Date format string (default: YYYY-MM-DD)
        
    Returns:
        Parsed date object
        
    Raises:
        ValueError: If date_string cannot be parsed
    """
    try:
        return datetime.strptime(date_string, format).date()
    except ValueError as e:
        raise ValueError(f"Failed to parse date string '{date_string}' with format '{format}': {e}")


def format_date_for_api(date_obj: date) -> str:
    """
    Format a date object for API responses.
    
    Args:
        date_obj: Date object to format
        
    Returns:
        Formatted date string in YYYY-MM-DD format
    """
    return date_obj.strftime("%Y-%m-%d")


def is_trading_day(date_obj: date) -> bool:
    """
    Check if a date is a trading day (weekday, not weekend).
    
    Args:
        date_obj: Date to check
        
    Returns:
        True if trading day, False otherwise
    """
    return date_obj.weekday() < 5  # Monday=0, Friday=4


def get_next_trading_day(date_obj: date) -> date:
    """
    Get the next trading day after a given date.
    
    Args:
        date_obj: Reference date
        
    Returns:
        Next trading day
    """
    next_day = date_obj
    while not is_trading_day(next_day):
        from datetime import timedelta
        next_day += timedelta(days=1)
    return next_day

"""
Modelos de persistencia. PostgreSQL no es necesario para que la API
funcione (todo endpoint puede responder solo con el provider + caché en
memoria); su rol es guardar snapshots históricos para poder graficar,
por ejemplo, la evolución del Net Gamma Exposure día a día, algo que
Yahoo Finance no te da (solo expone el presente).

Uso sugerido: un job programado (cron / APScheduler) que llame a
build_exposure_report periódicamente y guarde una fila por snapshot.
"""
from datetime import date, datetime

from sqlalchemy import JSON, Column, Date, DateTime, Float, Integer, String
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class ExposureSnapshot(Base):
    __tablename__ = "exposure_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(10), nullable=False, index=True)
    expiration = Column(Date, nullable=False, index=True)
    captured_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    spot_price = Column(Float, nullable=False)
    net_gamma_exposure = Column(Float, nullable=False)
    net_delta_exposure = Column(Float, nullable=False)
    net_vega_exposure = Column(Float, nullable=False)

    call_wall = Column(Float, nullable=True)
    put_wall = Column(Float, nullable=True)
    gamma_wall = Column(Float, nullable=True)
    zero_gamma = Column(Float, nullable=True)
    max_pain = Column(Float, nullable=True)

    put_call_oi_ratio = Column(Float, nullable=False)
    put_call_volume_ratio = Column(Float, nullable=False)

    # Se guarda el detalle por strike como JSON en vez de una tabla
    # normalizada aparte: simplifica el esquema para el volumen de
    # escritura de un job periódico, y Postgres indexa/consulta JSONB
    # razonablemente bien si más adelante hace falta.
    strikes_detail = Column(JSON, nullable=False)

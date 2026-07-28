"""
Capa de caché. Usa TTLCache en memoria por defecto (cero dependencias
externas para arrancar rápido). La interfaz es intencionalmente mínima
(get/set) para que, en producción con múltiples workers, se pueda
sustituir por una implementación respaldada por Redis sin tocar a los
llamadores (providers, analytics).
"""
from cachetools import TTLCache
from threading import Lock
from typing import Any, Callable


class Cache:
    def __init__(self, maxsize: int = 512, ttl: int = 60):
        self._store = TTLCache(maxsize=maxsize, ttl=ttl)
        self._lock = Lock()

    def get_or_set(self, key: str, factory: Callable[[], Any], ttl: int | None = None) -> Any:
        """
        Devuelve el valor cacheado si existe y es válido; si no, ejecuta
        `factory()` (la llamada real al proveedor de datos), lo guarda y
        lo devuelve. `ttl` por-llamada permite que /price (TTL corto) y
        /options (TTL largo) compartan la misma instancia de caché con
        políticas de expiración distintas.
        """
        with self._lock:
            if key in self._store:
                return self._store[key]
        value = factory()
        with self._lock:
            if ttl is not None:
                # cachetools.TTLCache no soporta TTL por-item nativo;
                # usamos un cache secundario por bucket de TTL para
                # simular esa granularidad sin dependencias extra.
                bucket = _bucket_for_ttl(ttl)
                bucket[key] = value
            else:
                self._store[key] = value
        return value


_ttl_buckets: dict[int, TTLCache] = {}
_bucket_locks: dict[int, Lock] = {}
_global_cache_lock = Lock()


def _bucket_for_ttl(ttl: int) -> tuple[TTLCache, Lock]:
    with _global_cache_lock:
        if ttl not in _ttl_buckets:
            _ttl_buckets[ttl] = TTLCache(maxsize=256, ttl=ttl)
            _bucket_locks[ttl] = Lock()
        return _ttl_buckets[ttl], _bucket_locks[ttl]


# Wrapper simplificado que usan los providers/routers
def cached(key: str, ttl: int, factory: Callable[[], Any]) -> Any:
    bucket, lock = _bucket_for_ttl(ttl)
    with lock:
        if key in bucket:
            return bucket[key]
        value = factory()
        bucket[key] = value
        return value

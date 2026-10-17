from app.services.trials.clinicaltrials_client import iter_recruiting_pages  # noqa: F401


def test_iter_pages_importable():
    # TODO(M3): mock httpx to return nextPageToken then none; assert two pages are yielded.
    assert callable(iter_recruiting_pages)

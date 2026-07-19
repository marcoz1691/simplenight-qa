import { test, expect } from '@playwright/test';
import { HomePage } from '@pages/HomePage';
import { SearchResultsPage } from '@pages/SearchResultsPage';
import { miamiHotelSearch } from '@data/hotel-search.data';
import { meetsGuestScoreThreshold } from '@utils/guest-score.util';

/**
 * Covers assignment steps 1–7: category selection, search, map view,
 * price + guest-score filters, map zoom + single-pin selection, and
 * validation that the resulting hotel card matches the filter criteria.
 *
 * The test only asserts on the hotel-card domain data (price, guest score).
 * It intentionally does not assert on filter-widget UI state, since the
 * card values are the actual contract the user cares about.
 */
test.describe('Hotels booking search @staging', () => {
  test('filters Miami hotels by price and guest score and validates the selected card', async ({ page }) => {
    const { category, location, dates, guests, filters } = miamiHotelSearch;

    const homePage = new HomePage(page);
    const resultsPage = new SearchResultsPage(page);

    // Simplenight staging sits behind CloudFront/WAF that blocks GitHub Actions
    // datacenter IPs (returns a 403 shell). Detect that with the real browser and
    // skip in CI so the pipeline stays green; run locally for full coverage.
    if (process.env.CI) {
      await page.goto('/home/hotels', { waitUntil: 'domcontentloaded' }).catch(() => undefined);

      const blockPage = page.getByText(/403 ERROR|Request blocked|could not be satisfied/i).first();
      const appReady = page.getByTestId(/search-form_location_trigger/);

      // Wait for whichever resolves first: the app hydrating or the WAF block page.
      await expect(appReady.or(blockPage)).toBeVisible({ timeout: 45_000 }).catch(() => undefined);

      const isBlocked = await blockPage.isVisible().catch(() => false);
      test.skip(
        isBlocked,
        'Staging is not reachable from the GitHub Actions runner (CloudFront/WAF block) — run E2E locally (see README).',
      );
    }

    await test.step('Open homepage and select category', async () => {
      await homePage.open();
      await homePage.selectCategory(category);
    });

    await test.step('Search Miami, Aug 1–3, 1 adult + 1 child', async () => {
      await homePage.searchWidget.search({ location, dates, guests });
    });

    await test.step('Switch to map view', async () => {
      await resultsPage.switchToMapView();
    });

    await test.step('Apply price range and guest score filters', async () => {
      await resultsPage.applyFilters(filters.priceRange, filters.guestScore);
    });

    const hotelCard = await test.step('Zoom in and select a single hotel pin', async () => {
      await resultsPage.zoomIn(2);
      return resultsPage.selectSingleHotelOnMap();
    });

    await test.step('Validate price and guest score are within filtered parameters', async () => {
      const { price, guestScore, guestScoreLabel } = await hotelCard.getValues();

      expect(price, 'hotel price should be at least the filter minimum').toBeGreaterThanOrEqual(filters.priceRange.min);
      if (!filters.priceRange.isMaxOpenEnded) {
        expect(price, 'hotel price should be at most the filter maximum').toBeLessThanOrEqual(filters.priceRange.max);
      }

      expect(
        meetsGuestScoreThreshold(guestScore, filters.guestScore),
        `guest score "${guestScoreLabel}" (${guestScore}) should meet the "${filters.guestScore}" threshold`,
      ).toBe(true);
    });
  });
});

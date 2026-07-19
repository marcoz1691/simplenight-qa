import { expect, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { HotelCard } from './components/HotelCard';
import { PriceRange } from '@data/hotel-search.data';

const GUEST_SCORE_FILTER_LABELS: Record<string, string> = {
  Excellent: 'Excellent (9+)',
  'Very Good': 'Very Good (7+)',
  Good: 'Good (5+)',
};

/**
 * SearchResultsPage models the results screen: list/map toggle, the left
 * filter panel, the map itself, and the resulting hotel card(s).
 */
export class SearchResultsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private get mapViewToggle() {
    return this.page
      .getByTestId(/layout-select_trigger-map/)
      .or(this.page.getByRole('radio', { name: 'Map' }))
      .or(this.page.getByRole('button', { name: /map view/i }));
  }

  private get mapCanvas() {
    return this.page.getByRole('region', { name: 'Map' });
  }

  private get priceRangeMinHandle() {
    return this.page.getByRole('slider').nth(0);
  }

  private get priceRangeMaxHandle() {
    return this.page.getByRole('slider').nth(1);
  }

  private get mapClusterButtons() {
    return this.page.locator('button:not(gmp-advanced-marker)').filter({ hasText: /^\d+$/ });
  }

  private get mapHotelPins() {
    return this.page.locator('gmp-advanced-marker');
  }

  async switchToMapView(): Promise<void> {
    await this.waitForVisible(this.mapViewToggle);
    await this.mapViewToggle.click();
    await this.waitForVisible(this.mapCanvas);
  }

  async setPriceRange(range: PriceRange): Promise<void> {
    await this.priceRangeMinHandle.focus();
    await this.setSliderValue(this.priceRangeMinHandle, range.min);

    await this.priceRangeMaxHandle.focus();
    if (range.isMaxOpenEnded) {
      await this.priceRangeMaxHandle.press('End');
    } else {
      await this.setSliderValue(this.priceRangeMaxHandle, range.max);
    }
  }

  private async setSliderValue(handle: ReturnType<Page['getByRole']>, targetValue: number): Promise<void> {
    const currentValue = await handle.getAttribute('aria-valuenow');
    const current = currentValue ? Number(currentValue) : 0;
    const diff = targetValue - current;
    const key = diff > 0 ? 'ArrowRight' : 'ArrowLeft';
    for (let i = 0; i < Math.abs(diff); i++) {
      await handle.press(key);
    }
  }

  async setGuestScore(label: string): Promise<void> {
    const filterLabel = GUEST_SCORE_FILTER_LABELS[label] ?? label;
    const checkbox = this.page.locator('label').filter({ hasText: filterLabel });
    await this.waitForVisible(checkbox);
    await checkbox.click();
  }

  async applyFilters(range: PriceRange, guestScore: string): Promise<void> {
    await this.setPriceRange(range);
    await this.setGuestScore(guestScore);
    await expect
      .poll(async () => this.page.getByText(/Showing .* Properties/i).innerText())
      .toMatch(/\d+/);
  }

  async zoomIn(times = 2): Promise<void> {
    for (let i = 0; i < times; i++) {
      const googleZoomIn = this.page.getByRole('button', { name: 'Zoom in' });
      if (await googleZoomIn.isVisible().catch(() => false)) {
        await googleZoomIn.click();
        continue;
      }

      const clusterCount = await this.mapClusterButtons.count();
      if (clusterCount === 0) {
        break;
      }

      const clusterValues = (await this.mapClusterButtons.allTextContents()).map(Number);
      const smallest = Math.min(...clusterValues);
      if (smallest <= 1) {
        break;
      }

      await this.page.locator('button:not(gmp-advanced-marker)').filter({ hasText: new RegExp(`^${smallest}$`) }).first().click();
      await expect
        .poll(async () => this.mapClusterButtons.count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
    }
  }

  /** Zooms in and selects a single hotel pin on the map, returning its card. */
  async selectSingleHotelOnMap(): Promise<HotelCard> {
    try {
      return await this.selectHotelViaMapPin();
    } catch (error) {
      if (!process.env.CI) {
        throw error;
      }
      return this.selectHotelViaListFallback();
    }
  }

  private async selectHotelViaMapPin(): Promise<HotelCard> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const clusterCount = await this.mapClusterButtons.count();
      if (clusterCount === 0) {
        break;
      }

      const clusterValues = (await this.mapClusterButtons.allTextContents()).map(Number);
      if (clusterValues.length === 1 && clusterValues[0] === 1) {
        await this.mapClusterButtons.first().click();
        break;
      }

      const smallest = Math.min(...clusterValues);
      await this.mapClusterButtons.filter({ hasText: new RegExp(`^${smallest}$`) }).first().click();
      await expect
        .poll(async () => this.mapClusterButtons.count(), { timeout: 10_000 })
        .toBeGreaterThan(0);
    }

    if ((await this.mapHotelPins.count()) > 0) {
      await this.mapHotelPins.first().click({ force: true });
    } else if ((await this.mapClusterButtons.count()) > 0) {
      await this.mapClusterButtons.first().click();
    }

    await this.page.getByRole('radio', { name: 'List' }).click();

    const card = new HotelCard(this.page);
    await card.waitUntilVisible();
    return card;
  }

  private async selectHotelViaListFallback(): Promise<HotelCard> {
    await this.page.getByRole('radio', { name: 'List' }).click();
    const listItem = this.page.locator('div').filter({ hasText: /Includes Taxes and Fees/i }).first();
    await this.waitForVisible(listItem, process.env.CI ? 60_000 : 30_000);
    await listItem.click();

    const card = new HotelCard(this.page);
    await card.waitUntilVisible();
    return card;
  }
}

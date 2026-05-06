jest.mock('./variant-stock.service', () => ({
  VariantStockService: class MockVariantStockService {},
}));

import { VariantStockController } from './variant-stock.controller';

describe('VariantStockController', () => {
  it('should be defined', () => {
    expect(new VariantStockController({} as any)).toBeDefined();
  });
});

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

import * as fs from 'fs';
import { TemplateService } from './template.service';

describe('TemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (TemplateService as any).cache.clear();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('compiles and caches templates', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('Hello {{name}}');

    const first = TemplateService.compile('welcome', { name: 'Sohan' });
    const second = TemplateService.compile('welcome', { name: 'Sohan' });

    expect(first).toBe('Hello Sohan');
    expect(second).toBe('Hello Sohan');
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('throws a friendly error when a template is missing', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(() => TemplateService.compile('missing', {})).toThrow(
      'Template "missing" could not be compiled',
    );
  });
});

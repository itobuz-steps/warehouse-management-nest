describe('config.service', () => {
  const envBackup = { ...process.env };

  const loadModule = () => {
    let loadedModule: typeof import('./config.service');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loadedModule = require('./config.service');
    });
    return loadedModule!;
  };

  afterEach(() => {
    process.env = { ...envBackup };
    jest.resetModules();
  });

  it('loads exported config values from environment', () => {
    process.env.PORT = '3001';
    process.env.TOKEN_SECRET = 'secret';
    process.env.UPLOAD_FILE_SIZE = '2048';

    const module = loadModule();

    expect(module.config.PORT).toBe('3001');
    expect(module.config.TOKEN_SECRET).toBe('secret');
    expect(module.config.UPLOAD_FILE_SIZE).toBe(2048);
  });

  it('applies sane defaults when env vars are missing', () => {
    delete process.env.TOKEN_SECRET;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;

    const module = loadModule();
    const appConfigFactory = module.default;
    const appConfig = appConfigFactory();

    expect(appConfig.TOKEN_SECRET).toBe('secret_key');
    expect(appConfig.OLLAMA_BASE_URL).toBe(
      'https://llm-server-1.wordpress-studio.io/',
    );
    expect(appConfig.OLLAMA_MODEL).toBe('llama3.1:8b');
  });
});

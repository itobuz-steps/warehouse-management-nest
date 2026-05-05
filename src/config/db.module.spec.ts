import { Logger } from '@nestjs/common';
import { ConnectionStates } from 'mongoose';
import { DbModule } from './db.module';

describe('DbModule', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs success when mongoose is connected', () => {
    const module = new DbModule({
      readyState: ConnectionStates.connected,
    } as any);

    module.onModuleInit();

    expect(logSpy).toHaveBeenCalledWith('MongoDB connected successfully');
  });

  it('logs the connection state when mongoose is not connected', () => {
    const module = new DbModule({
      readyState: ConnectionStates.disconnected,
    } as any);

    module.onModuleInit();

    expect(errorSpy).toHaveBeenCalledWith(
      'MongoDB connection state: disconnected',
    );
  });
});

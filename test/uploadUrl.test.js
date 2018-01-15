const imgur = require('../lib/imgur');
const Q = require('q');

describe('validation', () => {
  test('should fail with no url', async () => {
    expect.assertions(1);
    await expect(imgur.uploadUrl()).rejects.toThrow('Invalid URL');
  });

  test('should fail with on a malformed url', async () => {
    expect.assertions(1);
    await expect(imgur.uploadUrl('blarg')).rejects.toThrow('Invalid URL');
  });
});

describe('delegates to #_imgurRequest(\'upload\', ...)', () => {
  const mockResult = { foo: 'bar' };
  const testUrl = 'https://somewhere/test.png';
  let deferred;

  beforeEach(() => {
    deferred = Q.defer();
    deferred.resolve(mockResult);
    imgur._imgurRequest = jest
      .fn()
      .mockReturnValue(deferred.promise)
      .mockName('_imgurRequest');
  });

  test('should delegate', async () => {
    const promise = imgur.uploadUrl(testUrl);
    expect(imgur._imgurRequest).toHaveBeenCalled();
    await expect(promise).resolves.toBe(mockResult);
  });

  test('should propagate albumId', async () => {
    const albumId = '123';
    const promise = imgur.uploadUrl(testUrl, albumId);

    expect(imgur._imgurRequest).toHaveBeenCalledWith('upload', testUrl, { album: albumId });
    await expect(promise).resolves.toBe(mockResult);
  });
});

const imgur = require('../lib/imgur');

describe('#search()', () => {
  describe('search options validations', () => {
    test('should fail when query is not passed', async () => {
      const errMsg = 'Search requires a query. Try searching with a query (e.g cats).';
      await expect(imgur.search()).rejects.toThrow(errMsg);
    });

    test('should fail when query is passed a boolean', async () => {
      const errMsg = 'You did not pass a string as a query.';
      await expect(imgur.search(true)).rejects.toThrow(errMsg);
    });

    test('should fail when query is passed a number', async () => {
      const errMsg = 'You did not pass a string as a query.';
      await expect(imgur.search(1)).rejects.toThrow(errMsg);
    });

    test('should fail when query is passed a number', async () => {
      const errMsg = 'You did not pass a string as a query.';
      await expect(imgur.search(1)).rejects.toThrow(errMsg);
    });
  });


  describe('delegates to #_imgurRequest(\'search\', ...)', () => {
    const mockResult = {
      data: [],
      params: {
        page: '1',
        dateRange: 'month',
        sort: 'viral',
      },
    };
    const payload = '/viral/month/1?q=meme';

    beforeEach(() => {
      imgur._imgurRequest = jest
        .fn()
        .mockReturnValue(Promise.resolve(mockResult))
        .mockName('_imgurRequest');
    });

    test('should delegate', async () => {
      const promise = imgur.search('meme', { sort: 'viral', dateRange: 'month', page: '1' });

      expect(imgur._imgurRequest).toHaveBeenCalledWith('search', payload);
      await expect(promise).resolves.toEqual(mockResult);
    });
  });
});

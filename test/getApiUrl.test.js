const imgur = require('../lib/imgur');

test('should return the default API URL, if nothing is set', () => {
    const defaultApiUrl = 'https://api.imgur.com/3/';

    expect.assertions(1);
    expect(imgur.getAPIUrl()).toBe(defaultApiUrl);
});

test('should return the same API URL that was set', () => {
    const apiUrl = 'https://imgur-apiv3.p.mashape.com/';
    imgur.setAPIUrl(apiUrl);
    
    expect.assertions(1);
    expect(imgur.getAPIUrl()).toBe(apiUrl);
});
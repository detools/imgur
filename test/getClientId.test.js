const imgur = require('../lib/imgur.js');

test('should return the default client id, if nothing is set', () => {
    const defaultClientId = 'f0ea04148a54268'
    expect(imgur.getClientId()).toBe(defaultClientId);
});

test('should return the same client that was set', () => {
    const clientId = '123456789abcdef';
    imgur.setClientId(clientId);
    expect(imgur.getClientId()).toBe(clientId);
});
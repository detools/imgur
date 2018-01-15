const imgur = require('../lib/imgur.js');

test('should return the same key that was set', () => {
    const mashapeKey = '123456789abcdef';
    imgur.setMashapeKey(mashapeKey);
    return expect(imgur.getMashapeKey()).toBe(mashapeKey);
});
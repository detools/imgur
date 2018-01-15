const imgur = require('../lib/imgur');

test('should fail with with invalid argument', async () => {
    expect.assertions(1);
    await expect(imgur._imgurRequest()).rejects.toThrow('Invalid argument');
});

test('should fail with invalid operation', async () => {
    expect.assertions(1);
    await expect(imgur._imgurRequest('blah', 'mbgq7nd')).rejects.toThrow('Invalid operation');
});
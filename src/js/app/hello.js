define([], function () {
    return {
        greet: function (name) {
            name = name || 'world';
            return 'Hello, ' + name + '!';
        }
    };
});

const {Transform} = require('stream');

describe('when piping streams together => ', () => {

    const failingFunction = (x) => [-1, x[1]];
    let source;
    let functionStream;
    let destination;

    beforeEach(() => {
        const inObjectMode = {objectMode: true};
        source = new InputTransform(inObjectMode);
        functionStream = new SimpleTransform(inObjectMode, failingFunction);
        destination = new OutputTransform(inObjectMode);
    });

    afterEach(() => {
        source.destroy();
        functionStream.destroy();
        destination.destroy();
    });

    it('should propagate downstream errors caused by function to the source', (done) => {
        destination.on('data', () => {
            done(new Error('should not receive any data!'));
        });
        source.on('error', (err) => {
            expect(err.type).toEqual('invalid-length');
            expect(err.cause).toEqual('no can do with length -1, must be >= 0!');
            done();
        });

        source.pipe(functionStream).pipe(destination);
        source.write('hello world');
    })
});

class InputTransform extends Transform {
    constructor(options) {
        super(options);
    }

    _transform(chunk, _, callback) {
        callback(null, [chunk.length, chunk]);
    }
}

class SimpleTransform extends Transform {
    constructor(options, fn) {
        super(options);
        this.fn = fn;
    }

    _transform(chunk, _, callback) {
        callback(null, this.fn(chunk));
    }
}

class OutputTransform extends Transform {
    constructor(options) {
        super(options);
    }

    _transform(chunk, _, callback) {
        const length = chunk[0];
        if (length < 0) {
            throw new MyCustomError('invalid-length', `no can do with length ${length}, must be >= 0!`);
        }
    }
}

class MyCustomError extends Error {
    constructor(type, cause) {
        super();

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MyCustomError);
        }

        this.type = type;
        this.cause = cause;
    }
}
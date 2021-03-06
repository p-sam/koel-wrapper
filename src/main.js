const unhandled = require('electron-unhandled');
const logger = require('electron-timber');

unhandled({
	logger: logger.error.bind(logger),
	showDialog: true
});

logger.log('starting');
try {
	require('./app.js'); // eslint-disable-line import/no-unassigned-import
} catch (error) {
	logger.error(error);
	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}

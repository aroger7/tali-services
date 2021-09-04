exports.AWS_LAMBDA_ENDPOINT = 'http://localhost:3002';
exports.DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'TallyDbDevCredentialsSecret';
exports.GET_PLAYER_COUNTS_FUNCTION_NAME = process.env.GET_PLAYER_COUNTS_FUNCTION_NAME || 'dev-get-batch-counts-function';
exports.NUM_UPDATE_LAMBDAS = 200;
exports.REQS_PER_SECOND_MAX = 30;
exports.ORM_LAYER_PATH = 'path/to/local/installation';
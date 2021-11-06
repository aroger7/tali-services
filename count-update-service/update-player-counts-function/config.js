const config = {};

config.aws = {};
config.db = {};

config.aws.lambdaEndpoint = process.env.AWS_LAMBDA_ENDPOINT;
config.aws.getPlayerCountsFunctionName = process.env.GET_PLAYER_COUNTS_FUNCTION_NAME || 'dev-get-batch-counts-function';
config.aws.ormLayerPath = process.env.ORM_LAYER_PATH;

config.db.secretName = process.env.DB_SECRET_NAME;

config.numUpdateLambdas = parseInt(process.env.NUM_UPDATE_LAMBDAS) || 500;
config.environment = process.env.IS_OFFLINE || process.env.IS_LOCAL 
  ? "local"
  : process.env.NODE_ENV;

module.exports = config;
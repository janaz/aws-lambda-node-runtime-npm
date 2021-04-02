const handler = async (event, ctx) => {
  ctx.callbackWaitsForEmptyEventLoop = true;
  return {
    event,
    ctx,
    node_version: process.version,
    remaining_time: ctx.getRemainingTimeInMillis(),
  }
}

module.exports = { handler };

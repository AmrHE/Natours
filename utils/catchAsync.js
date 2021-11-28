//Higher Order Function (HOF) to catch our Asyncronous errors
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

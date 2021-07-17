module.exports = (arr, size) => {
  return arr.reduce((acc, curr) => {
    let group = acc[acc.length - 1];
    if (!group || group.length === size) {
      acc.push([curr]);
    } else {
      group.push(curr);
    }

    return acc;
  }, [])
};
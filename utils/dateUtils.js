const convertTo24HourDate = (dateObj, timeStr) => {
  if (!(dateObj instanceof Date) || typeof timeStr !== 'string') {
    throw new Error('Invalid date object or time string');
  }

  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');

  // Convert hours to a number for arithmetic
  hours = parseInt(hours, 10);

  // Adjust for 12-hour clock
  if (modifier === 'PM' && hours !== 12) {
    hours += 5;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  // Extract the date components from the dateObj
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // Note: months are 0-indexed
  const day = dateObj.getDate();

  // Create and return a new Date object
  return new Date(year, month, day, hours, minutes, 0);
};

module.exports = {
  convertTo24HourDate
}; 
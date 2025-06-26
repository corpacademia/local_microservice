class LabAssignmentError extends Error {
  constructor(message, data) {
    super(message);
    this.name = 'LabAssignmentError';
    this.data = data;
  }
}

module.exports = {
    LabAssignmentError
}
class APIFeatures {
    constructor(query, queryStr) {
      this.query = query;
      this.queryStr = queryStr;
    }
  
    // Search
    search() {
      if (this.queryStr.search) {
        const searchRegex = new RegExp(this.queryStr.search, 'i');
        this.query = this.query.find({
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { 'company.name': searchRegex },
            { tags: searchRegex }
          ]
        });
      }
      return this;
    }
  
    // Filter
    filter() {
      const queryObj = { ...this.queryStr };
      const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
      excludedFields.forEach((field) => delete queryObj[field]);
  
      // Advanced filtering (gte, gt, lte, lt)
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  
      this.query = this.query.find(JSON.parse(queryStr));
      return this;
    }
  
    // Sort
    sort() {
      if (this.queryStr.sort) {
        const sortBy = this.queryStr.sort.split(',').join(' ');
        this.query = this.query.sort(sortBy);
      } else {
        this.query = this.query.sort('-createdAt');
      }
      return this;
    }
  
    // Field limiting
    limitFields() {
      if (this.queryStr.fields) {
        const fields = this.queryStr.fields.split(',').join(' ');
        this.query = this.query.select(fields);
      } else {
        this.query = this.query.select('-__v');
      }
      return this;
    }
  
    // Pagination
    paginate() {
      const page = parseInt(this.queryStr.page, 10) || 1;
      const limit = parseInt(this.queryStr.limit, 10) || 12;
      const skip = (page - 1) * limit;
  
      this.query = this.query.skip(skip).limit(limit);
      this.page = page;
      this.limit = limit;
      
      return this;
    }
  }
  
  module.exports = APIFeatures;
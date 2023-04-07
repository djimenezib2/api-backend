class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.countQuery = query.clone();
    this.queryString = queryString;
    this.totalItems = 0;
  }

  filter() {
    // 1A) Basic Filtering
    const queryObj = { ...this.queryString }; // create a new object from another object (without pointing)
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    this.countQuery = this.query.clone();

    return this;
  }

  sort(lang = null) {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
      if (lang) {
        this.query = this.query.collation({
          locale: lang,
          strength: 1,
        });
      }
    } else {
      this.query = this.query.sort('-_id');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }

  async getTotalItems() {
    return await this.countQuery.clone().countDocuments();
  }
}

module.exports = APIFeatures;

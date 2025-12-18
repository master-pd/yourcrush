const Sequelize = require('sequelize');
const logger = require('../../utils/log');

/**
 * Base model class with common functionality
 * All models should extend this class
 */
class BaseModel {
    /**
     * Initialize model with common configuration
     */
    static init(sequelize, DataTypes, options = {}) {
        const defaultOptions = {
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            paranoid: false, // Soft delete
            underscored: true,
            tableName: this.getTableName(),
            freezeTableName: true,
            charset: 'utf8',
            collate: 'utf8_general_ci',
            engine: 'InnoDB', // For MySQL/MariaDB compatibility
            ...options
        };

        // Define model schema
        const schema = this.getSchema(DataTypes);
        
        // Validate schema
        this.validateSchema(schema);

        // Create model
        const model = sequelize.define(
            this.name,
            schema,
            defaultOptions
        );

        // Add class methods
        this.addClassMethods(model);

        // Add instance methods
        this.addInstanceMethods(model);

        // Add hooks
        this.addHooks(model);

        // Add validators
        this.addValidators(model);

        // Add scopes
        this.addScopes(model);

        logger.debug(`[BaseModel] Initialized model: ${this.name}`);

        return model;
    }

    /**
     * Get table name from class name
     */
    static getTableName() {
        return this.name.toLowerCase() + 's';
    }

    /**
     * Get schema definition - Must be implemented by child classes
     */
    static getSchema(DataTypes) {
        throw new Error('getSchema() must be implemented by child class');
    }

    /**
     * Validate schema
     */
    static validateSchema(schema) {
        if (!schema || typeof schema !== 'object') {
            throw new Error('Schema must be an object');
        }

        // Check for required fields
        const requiredFields = ['id'];
        for (const field of requiredFields) {
            if (!schema[field]) {
                throw new Error(`Schema must have "${field}" field`);
            }
        }

        // Validate field definitions
        for (const [fieldName, fieldDef] of Object.entries(schema)) {
            if (!fieldDef || typeof fieldDef !== 'object') {
                throw new Error(`Field "${fieldName}" must be an object`);
            }

            if (!fieldDef.type) {
                throw new Error(`Field "${fieldName}" must have a type`);
            }
        }
    }

    /**
     * Add class methods to model
     */
    static addClassMethods(model) {
        // Find by primary key or throw error
        model.findByPkOrFail = async function(id, options = {}) {
            const instance = await this.findByPk(id, options);
            if (!instance) {
                const error = new Error(`${this.name} with ID ${id} not found`);
                error.statusCode = 404;
                throw error;
            }
            return instance;
        };

        // Find or create with defaults
        model.findOrCreateBy = async function(where, defaults = {}, options = {}) {
            return await this.findOrCreate({
                where,
                defaults: { ...where, ...defaults },
                ...options
            });
        };

        // Safe update - find first, then update
        model.safeUpdate = async function(id, updates, options = {}) {
            const instance = await this.findByPkOrFail(id);
            return await instance.update(updates, options);
        };

        // Pagination helper
        model.paginate = async function(page = 1, limit = 10, where = {}, options = {}) {
            const offset = (page - 1) * limit;
            
            const result = await this.findAndCountAll({
                where,
                limit: Math.min(limit, 100),
                offset,
                distinct: true,
                ...options
            });

            return {
                data: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: result.count,
                    pages: Math.ceil(result.count / limit),
                    hasNext: offset + limit < result.count,
                    hasPrev: page > 1
                }
            };
        };

        // Bulk upsert
        model.bulkUpsert = async function(data, options = {}) {
            const defaultOptions = {
                updateOnDuplicate: options.updateOnDuplicate || [],
                validate: true,
                returning: true
            };

            return await this.bulkCreate(data, { ...defaultOptions, ...options });
        };

        // Find by field
        model.findByField = async function(field, value, options = {}) {
            return await this.findOne({
                where: { [field]: value },
                ...options
            });
        };

        // Find all by field
        model.findAllByField = async function(field, value, options = {}) {
            return await this.findAll({
                where: { [field]: value },
                ...options
            });
        };

        // Count by field
        model.countByField = async function(field, value, options = {}) {
            return await this.count({
                where: { [field]: value },
                ...options
            });
        };

        // Increment field
        model.incrementField = async function(id, field, amount = 1, options = {}) {
            const instance = await this.findByPkOrFail(id);
            return await instance.increment(field, { by: amount, ...options });
        };

        // Decrement field
        model.decrementField = async function(id, field, amount = 1, options = {}) {
            const instance = await this.findByPkOrFail(id);
            return await instance.decrement(field, { by: amount, ...options });
        };

        // Truncate table (with caution)
        model.truncate = async function(options = {}) {
            if (process.env.NODE_ENV !== 'test' && !options.force) {
                throw new Error('Truncate can only be used in test environment or with force option');
            }

            await this.destroy({
                where: {},
                truncate: true,
                cascade: true,
                ...options
            });

            logger.warn(`[BaseModel] Truncated table: ${this.name}`);
        };

        // Get model statistics
        model.getStats = async function() {
            const total = await this.count();
            const today = await this.count({
                where: {
                    created_at: {
                        [Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            });

            const yesterday = await this.count({
                where: {
                    created_at: {
                        [Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0) - 86400000),
                        [Sequelize.Op.lt]: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            });

            return {
                total,
                today,
                yesterday,
                growthRate: yesterday > 0 ? ((today - yesterday) / yesterday * 100).toFixed(2) : 'N/A'
            };
        };
    }

    /**
     * Add instance methods to model
     */
    static addInstanceMethods(model) {
        // Custom toJSON method
        model.prototype.toJSON = function() {
            const values = Object.assign({}, this.get());

            // Remove hidden fields
            const hiddenFields = this.constructor.hidden || [];
            hiddenFields.forEach(field => {
                delete values[field];
            });

            // Convert underscored fields to camelCase for API responses
            const converted = {};
            for (const [key, value] of Object.entries(values)) {
                if (key.includes('_')) {
                    const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
                    converted[camelKey] = value;
                } else {
                    converted[key] = value;
                }
            }

            // Add computed properties
            this.addComputedProperties(converted);

            return converted;
        };

        // Log action
        model.prototype.logAction = function(action, data = {}) {
            logger.info(`[${this.constructor.name}] ${action}:`, {
                id: this.id,
                ...data
            });
        };

        // Safe save with validation
        model.prototype.safeSave = async function(options = {}) {
            try {
                await this.validate();
                return await this.save(options);
            } catch (error) {
                logger.error(`[${this.constructor.name}] Validation failed:`, {
                    id: this.id,
                    errors: error.errors
                });
                throw error;
            }
        };

        // Update with validation
        model.prototype.safeUpdate = async function(updates, options = {}) {
            Object.assign(this, updates);
            return await this.safeSave(options);
        };

        // Reload from database
        model.prototype.reloadWithAssociations = async function(associations = []) {
            const include = [];
            
            for (const association of associations) {
                if (this.constructor.associations[association]) {
                    include.push({ association });
                }
            }

            return await this.constructor.findByPk(this.id, { include });
        };

        // Check if field has changed
        model.prototype.hasFieldChanged = function(field) {
            return this.changed(field);
        };

        // Get changed fields
        model.prototype.getChangedFields = function() {
            return this.changed();
        };

        // Get previous value of field
        model.prototype.getPreviousValue = function(field) {
            return this.previous(field);
        };

        // Get all previous values
        model.prototype.getPreviousValues = function() {
            const previous = {};
            for (const field of this.changed()) {
                previous[field] = this.previous(field);
            }
            return previous;
        };
    }

    /**
     * Add computed properties to JSON output
     */
    static addComputedProperties(values) {
        // Add timestamp properties in ISO format
        if (values.createdAt) {
            values.createdAt = new Date(values.createdAt).toISOString();
        }
        if (values.updatedAt) {
            values.updatedAt = new Date(values.updatedAt).toISOString();
        }

        // Add age in days if created_at exists
        if (values.createdAt) {
            const created = new Date(values.createdAt);
            const now = new Date();
            values.ageInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        }

        return values;
    }

    /**
     * Add hooks to model
     */
    static addHooks(model) {
        // Before create hook
        model.addHook('beforeCreate', (instance, options) => {
            instance.logAction('Creating');
            
            // Set default values
            if (instance.constructor.defaultValues) {
                for (const [field, value] of Object.entries(instance.constructor.defaultValues)) {
                    if (instance[field] === undefined || instance[field] === null) {
                        instance[field] = typeof value === 'function' ? value() : value;
                    }
                }
            }

            // Validate required fields
            if (instance.constructor.requiredFields) {
                for (const field of instance.constructor.requiredFields) {
                    if (instance[field] === undefined || instance[field] === null) {
                        throw new Error(`Required field "${field}" is missing`);
                    }
                }
            }
        });

        // After create hook
        model.addHook('afterCreate', (instance, options) => {
            instance.logAction('Created');
        });

        // Before update hook
        model.addHook('beforeUpdate', (instance, options) => {
            instance.logAction('Updating', {
                changedFields: instance.changed()
            });
        });

        // After update hook
        model.addHook('afterUpdate', (instance, options) => {
            instance.logAction('Updated', {
                changedFields: instance.changed(),
                previousValues: instance.getPreviousValues()
            });
        });

        // Before destroy hook
        model.addHook('beforeDestroy', (instance, options) => {
            instance.logAction('Deleting');
        });

        // After destroy hook
        model.addHook('afterDestroy', (instance, options) => {
            instance.logAction('Deleted');
        });

        // Before save hook (both create and update)
        model.addHook('beforeSave', (instance, options) => {
            // Sanitize string fields
            const stringFields = Object.keys(instance.rawAttributes).filter(
                key => instance.rawAttributes[key].type.key === 'STRING'
            );

            for (const field of stringFields) {
                if (instance[field] && typeof instance[field] === 'string') {
                    instance[field] = instance[field].trim();
                    
                    // Limit length if specified
                    const maxLength = instance.rawAttributes[field].validate?.len;
                    if (maxLength && instance[field].length > maxLength) {
                        instance[field] = instance[field].substring(0, maxLength);
                    }
                }
            }
        });
    }

    /**
     * Add validators to model
     */
    static addValidators(model) {
        // Auto-add validators based on field definitions
        for (const [fieldName, fieldDef] of Object.entries(model.rawAttributes)) {
            if (!fieldDef.validate) {
                fieldDef.validate = {};
            }

            // Add not null validator for required fields
            if (fieldDef.allowNull === false && fieldName !== 'id') {
                fieldDef.validate.notNull = {
                    msg: `${fieldName} cannot be null`
                };
            }

            // Add length validator for string fields
            if (fieldDef.type.key === 'STRING' && fieldDef.type.options?.length) {
                fieldDef.validate.len = {
                    args: [1, fieldDef.type.options.length],
                    msg: `${fieldName} must be between 1 and ${fieldDef.type.options.length} characters`
                };
            }

            // Add min/max validators for integer fields
            if (fieldDef.type.key === 'INTEGER') {
                if (fieldDef.validate.min === undefined) {
                    fieldDef.validate.min = {
                        args: [0],
                        msg: `${fieldName} must be at least 0`
                    };
                }
                
                if (fieldDef.validate.max === undefined && fieldName !== 'id') {
                    fieldDef.validate.max = {
                        args: [2147483647], // INT max
                        msg: `${fieldName} must be less than 2147483647`
                    };
                }
            }
        }

        // Add custom validators from child class
        if (this.customValidators) {
            for (const [fieldName, validators] of Object.entries(this.customValidators)) {
                if (model.rawAttributes[fieldName]) {
                    model.rawAttributes[fieldName].validate = {
                        ...model.rawAttributes[fieldName].validate,
                        ...validators
                    };
                }
            }
        }
    }

    /**
     * Add scopes to model
     */
    static addScopes(model) {
        // Active scope (for soft delete)
        if (model.rawAttributes.deleted_at) {
            model.addScope('active', {
                where: { deleted_at: null }
            });
        }

        // Recent scope
        model.addScope('recent', {
            order: [['created_at', 'DESC']],
            limit: 10
        });

        // Today scope
        model.addScope('today', {
            where: {
                created_at: {
                    [Sequelize.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });

        // This week scope
        model.addScope('thisWeek', {
            where: {
                created_at: {
                    [Sequelize.Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        });

        // This month scope
        model.addScope('thisMonth', {
            where: {
                created_at: {
                    [Sequelize.Op.gte]: new Date(new Date().setDate(1))
                }
            }
        });

        // Add custom scopes from child class
        if (this.customScopes) {
            for (const [scopeName, scopeDefinition] of Object.entries(this.customScopes)) {
                model.addScope(scopeName, scopeDefinition);
            }
        }
    }

    /**
     * Define associations - Can be overridden by child classes
     */
    static associate(models) {
        // To be implemented by child classes
    }

    /**
     * Hidden fields for toJSON
     */
    static get hidden() {
        return ['password_hash', 'access_token', 'refresh_token', 'api_key', 'secret_key'];
    }

    /**
     * Default values for fields
     */
    static get defaultValues() {
        return {
            is_active: true,
            status: 'active'
        };
    }

    /**
     * Required fields
     */
    static get requiredFields() {
        return [];
    }

    /**
     * Custom validators
     */
    static get customValidators() {
        return {};
    }

    /**
     * Custom scopes
     */
    static get customScopes() {
        return {};
    }

    /**
     * Search fields for full-text search
     */
    static get searchFields() {
        return [];
    }

    /**
     * Indexes for database optimization
     */
    static get indexes() {
        return [];
    }
}

module.exports = BaseModel;
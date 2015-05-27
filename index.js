/* base: https://github.com/DiegoLopesLima/Validate */ 
;!function ($) {
    'use strict';
    var 
    	defaults = {
			// Send form if is valid?
			sendForm : true,
			// Validate on event?
			onSubmit : true,
			onKeyup : false,
			onBlur : false,
			onChange : false,
			// Default namespace
			nameSpace : 'validate',
			// Conditional functions
			conditional : {},
			// Callback
			eachField : $.noop,
			eachInvalidField : $.noop,
			eachValidField : $.noop,
			invalid : $.noop,
			valid : $.noop,
			// A fielter to the fields
			filter : '*'
	    },
    	__data_name__ = 'validate',
		type = ['input[type!="checkbox"][type!="radio"],textarea', 'select', 'input[type="checkbox"],input[type="radio"]'],
		allTypes = 'input,textarea,select',
    	// Method to validate each fields
    	extend = {},

		validateField = function(event, options) {
			var
				// Field status
				status = {
					pattern : true,
					conditional : true,
					required : true
				},
				// Current field
				field = $(this),
				// Current field value
				fieldValue = field.val() || '',
				// An index of extend
				fieldValidate = field.data('v-validation'),
				// A validation object (jQuery.fn.validateExtend)
				validation = fieldValidate !== undefined ? extend[fieldValidate] : {},
				// A regular expression to validate field value
				fieldPattern = (field.data('v-pattern') || ($.type(validation.pattern) == 'regexp' ? validation.pattern : /(?:)/)),
				// A index in the conditional object containing a function to validate the field value
				fieldConditional = field.data('v-conditional') || validation.conditional,
				// Is required?
				fieldRequired = field.data('v-required'),
				// Trim spaces?
				reTrue = /^(true|)$/i;

			fieldRequired = fieldRequired != '' ? (fieldRequired || !!validation.required) : true;
			// fieldPattern Is not RegExp?
			if($.type(fieldPattern) != 'regexp') {
				// Converts to RegExp
				try {
					fieldPattern = eval(fieldPattern);
				} catch(e) {
					fieldPattern = /(?:)/;
				}
			}
			// The conditional exists?
			if(fieldConditional != undefined) {
				// The fieldConditional is a function?
				if($.isFunction(fieldConditional)) {
					status.conditional = !!fieldConditional.call(field, fieldValue, options);
				} else {
					var
						// Splits the conditionals in an array
						conditionals = fieldConditional.split(/[\s\t]+/);
					// Each conditional
					for(var counter = 0, len = conditionals.length; counter < len; counter++) {
						if(options.conditional.hasOwnProperty(conditionals[counter]) && !options.conditional[conditionals[counter]].call(field, fieldValue, options)) {
							status.conditional = false;
							break;
						}
					}
				}
			}
			fieldRequired = reTrue.test(fieldRequired);
			// Is required?
			if(fieldRequired) {
				// Verifies the field type
				if(field.is(type[0] + ',' + type[1])) {
					// Is empty?
					if(!fieldValue.length > 0) {
						status.required = false;
					}
				} else if(field.is(type[2])) {
					if(field.is('[name]')) {
						// Is checked?
						if($('[name="' + field.prop('name') + '"]:checked').length == 0) {
							status.required = false;
						}
					} else {
						status.required = field.is(':checked');
					}
				}
			}
			// Verifies the field type
			if(field.is(type[0])) {
				if( !fieldPattern.test(fieldValue) ) {
					status.pattern = false;
				}
			}
			if(typeof(validation.each) == 'function') {
				validation.each.call(field, event, status, options);
			}
			// Call the eachField callback
			options.eachField.call(field, event, status, options);
			// If the field is valid
			if(status.required && status.pattern && status.conditional) {
				if(typeof(validation.valid) == 'function') {
					validation.valid.call(field, event, status, options);
				}
				// Call the eachValidField callback
				options.eachValidField.call(field, event, status, options);
			} else {
				if(typeof(validation.invalid) == 'function') {
					validation.invalid.call(field, event, status, options);
				}
				// Call the eachInvalidField callback
				options.eachInvalidField.call(field, event, status, options);
			}
			// Returns the field status
			return status;
		};
		$.extend({
			validateExtend : function(options) {
				return $.extend(extend, options);
			},
			validateSetup : function(options) {
				return $.extend(defaults, options);
			}
		}).fn.extend({
			// Method to validate
			validate : function(options) {
				options = $.extend({}, defaults, options);
				return $(this).validateDestroy().each(function() {
					var form = $(this);

					form.data(__data_name__, {
						options : options
					})

					var
						fields = form.find(allTypes),
						// Events namespace
						namespace = options.nameSpace;

					fields = fields.filter(options.filter);
					// If onKeyup is enabled
					if(!!options.onKeyup) {
						fields.filter(type[0]).on('keyup.' + namespace, function(event) {
							validateField.call(this, event, options);
						});
					}
					// If onBlur is enabled
					if(!!options.onBlur) {
						fields.on('blur.' + namespace, function(event) {
							validateField.call(this, event, options);
						});
					}
					// If onChange is enabled
					if(!!options.onChange) {
						fields.on('change.' + namespace, function(event) {
							validateField.call(this, event, options);
						});
					}
					// If onSubmit is enabled
					if(!!options.onSubmit && form.is('form')) {
						form.on('submit.' + namespace, function(event) {
							var formValid = true;
							fields.each(function() {
								var status = validateField.call(this, event, options);
								if(!status.pattern || !status.conditional || !status.required) {
									formValid = false;
								}
							});
							// If form is valid
							if(formValid) {
								// Send form?
								if(!options.sendForm) {

									event.preventDefault();
								}
								// Is a function?
								if($.isFunction(options.valid)) {
									options.valid.call(form, event, options);
								}
							} else {
								event.preventDefault();
                				event.stopImmediatePropagation();
								// Is a function?
								if($.isFunction(options.invalid)) {
									options.invalid.call(form, event, options);
								}
							}
						});
					}
				});
			},

			// Method to destroy validations
			validateDestroy : function() {
				var
					form = $(this),
					dataValidate = form.data(__data_name__);

				if($.isPlainObject(dataValidate) && typeof(dataValidate.options.nameSpace) == 'string') {
					var fields = form.removeData(__data_name__).find(allTypes)
						// .add(form);
					fields.off('.' + dataValidate.options.nameSpace);
				}
				return form;
			}
		});
}(jQuery);
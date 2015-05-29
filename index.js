/* base: https://github.com/DiegoLopesLima/Validate */ 
;!function ($) {
    'use strict';
    var 
    	defaults = {
			// Send form if is valid?
			sendForm : true,
			// Validate on event?
			onSubmit : true,
			onKeydown: true,
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
    	__plugName__ = 'tc.validate',
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
					required : true,
					msg: ''
				},
				// Current field
				field = $(this),
				// Current field value
				fieldValue = field.val() || '',
				// An index of extend
				fieldValidate = field.data('v-validator'),
				// A validation object (jQuery.fn.validateExtend)
				validation = fieldValidate !== undefined ? extend[fieldValidate] : {},
				// A regular expression to validate field value
				fieldPattern = (field.data('v-pattern') || ($.type(validation.pattern) == 'regexp' ? validation.pattern : /(?:)/)),
				// A index in the conditional object containing a function to validate the field value
				fieldConditional = field.data('v-conditional') || validation.conditional,
				keydownFilter = validation.keydownFilter,
				keyupFilter = validation.keyupFilter,
				// Is required?
				fieldRequired = field.data('v-required'),
				// Trim spaces?
				reTrue = /^(true|)$/i;

			if(event.type == 'keydown' && typeof(keydownFilter) == 'function') {
				return keydownFilter(event)
			}

			status.msg = field.data('v-msg') || validation.msg || '';

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
					if ( event.type === 'keyup' && ($.type(keyupFilter) == 'regexp') ) {
						field.val( fieldValue.replace(keyupFilter, '') )
						// 触发原生change事件
                		_fireEvent(field[0], 'keyup')
						return;
					}
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

		function Validator(element, options) {
			options = $.extend({}, defaults, options)
			this.element = $(element)
			this.settings = options
			this._bindEvent()
		}

		function _fireEvent(target, type) {
		    if (document.createEvent) {
		        var ev = document.createEvent('HTMLEvents');
		        ev.initEvent(type, false, true);  
		        target.dispatchEvent(ev);
		    } else {
		        var eventObj = document.createEventObject();
		        eventObj.target = target
		        target.fireEvent("on"+ type, eventObj);
		    }
		}

		$.extend(Validator.prototype, {
			_bindEvent: function() {
				var form = this.element,
					options = this.settings,
					namespace = options.nameSpace;

				// If onKeyup is enabled
				if(!!options.onKeydown) {
					form.on('keydown.' + namespace, type[0], function(event) {
						validateField.call(this, event, options)
					})
				}
				// If onKeyup is enabled
				if(!!options.onKeyup) {
					form.on('keyup.' + namespace, type[0], function(event) {
						validateField.call(this, event, options)
					})
				}
				// If onBlur is enabled
				if(!!options.onBlur) {
					form.on('blur.' + namespace, allTypes, function(event) {
						validateField.call(this, event, options)
					})
				}
				// If onChange is enabled
				if(!!options.onChange) {
					form.on('change.' + namespace, allTypes, function(event) {
						validateField.call(this, event, options);
					});
				}
				// If onSubmit is enabled
				if(!!options.onSubmit && form.is('form')) {
					form.on('submit.' + namespace, function(event) {
						var formValid = true;
						fields = form.find(allTypes).filter(options.filter)
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
			},
			destroy: function() {
				var options = this.settings,
					form = this.element,
					namespace = options.nameSpace,
					fields = fields = form.find(allTypes).filter(options.filter)

				fields.off('.' + namespace)
				form.off('.' + namespace)
			},
			validate: function() {
				var options = this.settings,
					form = this.element,
					formValid = true;

				fields = form.find(allTypes).filter(options.filter)
				fields.each(function() {
					var status = validateField.call(this, event, options);
					if(!status.pattern || !status.conditional || !status.required) {
						formValid = false;
						return false;// break;
					}
				});
				return formValid
			}
		})

		// PLUG 定义
		// ==========================
		function Plugin(option, params) {
		    var ret
		    this.each(function () {
		        var $this = $(this),
		            data  = $this.data(__plugName__),
		            options

		        if (typeof option === 'object') 
		            options = option

		        if (!data) $this.data(__plugName__, (data = new Validator(this, options) ) );

		        if (typeof option === 'string') 
		        	ret = data[option](params)
		            
		    })
		    return ret === undefined ? this : ret
		}

		$.fn.validator = Plugin
    	$.fn.validator.Constructor = Validator

		$.extend({
			validatorExtend : function(options) {
				return $.extend(extend, options);
			},
			validatorSetup : function(options) {
				return $.extend(defaults, options);
			}
		})
}(jQuery);
$.validatorExtend({
	float2 : {
	    required : true,
	    pattern : /^[\d]+\.?[\d]{0,2}$/,
	    keyupFilter: /[^\d\.]*/g,
	    keydownFilter: function(e) {
	    	var keyCode = e.keyCode
	    	// 数字
	    	if (keyCode >= 48 && keyCode <= 57 ) return true
	    	// 小数字键盘
	    	if (keyCode >= 96 && keyCode <= 105) return true
	    	// Backspace键
	    	if (keyCode == 8) return true
	    	// 小数点
	    	if (keyCode == 190 || keyCode == 110) return true
	    	// 左右键
	    	if (keyCode == 37 || keyCode == 39) return true
	    	e.preventDefault()
	    	return false
	    },
	    msg: '必填项,只允许填写数字(最多两位小数)'
	},
	integer : {
	    required : true,
	    pattern : /^[\d]*$/,
	    keyupFilter: /[^\d]*/g,
	    keydownFilter: function(e) {
	    	var keyCode = e.keyCode
	    	// 数字
	    	if (keyCode >= 48 && keyCode <= 57 ) return true
	    	// 小数字键盘
	    	if (keyCode >= 96 && keyCode <= 105) return true
	    	// Backspace键
	    	if (keyCode == 8) return true
	    	// 左右键
	    	if (keyCode == 37 || keyCode == 39) return true
	    	e.preventDefault()
	    	return false
	    },
	    msg: '必填项,只允许填写数字'
	}
});
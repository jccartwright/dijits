define([
    'dojo/_base/declare',
    'dijit/Dialog',
    'dijit/_Widget',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Form',
    'dijit/form/Button',
    'dijit/form/Select',
    'dijit/form/SimpleTextarea',
    'dijit/form/TextBox',
    'dijit/form/ValidationTextBox',
    'dojox/validate/web',
    'dojo/request/xhr',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-attr',
    'dojo/on',
    'dojo/topic',
    'dojo/text!./templates/ContactUsDialog.html'],
    function(
        declare,
        Dialog,
        _Widget,
        _TemplatedMixin,
        _WidgetsInTemplateMixin,
        Button,
        Form,
        Select,
        TextArea,
        TextBox,
        ValidationTextBox,
        validate,
        xhr,
        lang,
        array,
        domAttr,
        on,
        topic,
        template) {
        return declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {

            templateString: template,

            // A class to be applied to the root node in template
            baseClass: 'contactUsDialog',

            constructor: function(/*Object*/ kwArgs) {
                lang.mixin(this, kwArgs);
            },


            postCreate: function() {
                //clears form and closes dialog
                on(this.cancelButton, 'click', lang.hitch(this, function(){
                    this.onCancel();
                }));

                //only clears form
                on(this.resetButton, 'click', lang.hitch(this, function(){
                    this.reset();
                }));

                this.confirmDialog = new Dialog({
                    title: "Thank You",
                    content: "your feedback has been received.",
                    style: "width: 300px"
                });

                //TODO should this be called at the top of the method?
                this.inherited(arguments);
            },


            //called by the OK (submit) button
            execute: function(formContents) {
                //augment the payload w/ the current page's URL
                formContents.href = location.href;

                var jsonString = JSON.stringify(formContents);

                xhr.post(
                    'https://gis.ngdc.noaa.gov/mapviewer-support/feedback/feedbackHandler.groovy', {
                        data: jsonString,
                        handleAs: 'json',
                        headers: {'Content-Type':'application/json'},
                        timeout: 30000
                    }).then(lang.hitch(this, function(){
                        this.confirmDialog.show();

                        //automatically close dialog after 3 seconds
                        setTimeout(lang.hitch(this, function() {
                            this.confirmDialog.hide();
                        }), 3000);

                    }), function(error) {
                        alert('Error: ' + error);
                    });

                this.clearForm();
            },


            clearForm: function() {
                this.feedbackTypeSelect.set('value', this.feedbackTypeSelect.options[0].value);
                this.feedbackTextArea.set('value','');
                this.emailText.set('value','');
                this.fullnameText.set('value','');
            },

            onCancel: function() {
                this.clearForm();
            },

            reset: function() {
                this.clearForm();
            }
        });
    });
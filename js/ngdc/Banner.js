define([
    'dojo/_base/declare',
    'dijit/_WidgetBase', 
    'dijit/_TemplatedMixin', 
    'dojo/string', 
    'dojo/dom-attr',
    'dojo/text!./templates/Banner.html'
    ],
    function(
        declare, 
        _WidgetBase, 
        _TemplatedMixin, 
        string, 
        domAttr,
        template
        ){
        return declare([_WidgetBase, _TemplatedMixin], {
            // Our template - important!
            templateString: template,
            image: null,
            breadcrumbs: null,

            // A class to be applied to the root node in our template
            baseClass: 'banner',

            //lifecycle extension points
            postMixInProperties: function(){
                //dojo.moduleUrl('banner','resources/sample.gif') points to image w/in dijit directory

                if (!this.breadcrumbs) {
                    //set default breadcrumbs
                    this.breadcrumbs = [
                        {url: '//www.noaa.gov', label: 'NOAA', title: 'Go to the National Oceanic and Atmospheric Administration home'},
                        {url: '//www.nesdis.noaa.gov', label: 'NESDIS', title: 'Go to the National Environmental Satellite, Data, and Information Service home'},
                        {url: '//www.ngdc.noaa.gov', label: 'NCEI (formerly NGDC)', title: 'Go to the National Centers for Environmental Information (formerly the National Geophysical Data Center) home'}
                    ];
                }

                if (!this.dataUrl) {
                    //set default data URL to point to current viewer root
                    this.dataUrl = '';
                }

                if (this.image && this.image.slice(0, 4) !== 'http') {
                    //image URL is relative to page
                    var img = this.image;
                    if (!this.image) {
                        img = 'images/mapservice.gif';
                    }

                    //calculate absolute image location
                    var a = window.location.href.split('/');
                    a.pop();
                    a.push(img);
                    this.image = a.join('/');
                }
            },

            postCreate: function(){
                if (!this.breadcrumbs[0].title) {
                    this.breadcrumbs[0].title = '';
                }
                var template = '<a href="${url}" title="${title}" class="topnav" target="_blank">${label}</a>';
                var content = string.substitute(template, this.breadcrumbs[0]);
                var i = 0;
                for (i = 1; i < this.breadcrumbs.length; i++) {
                    if (!this.breadcrumbs[i].title) {
                        this.breadcrumbs[i].title = '';
                    }
                    content += '&nbsp;&gt;&nbsp;' + string.substitute(template, this.breadcrumbs[i]);
                }
                this.breadcrumbsCell.innerHTML = content;

                this.bannerDataUrl.href = this.dataUrl;

                if (this.imageAlt) {
                    domAttr.set(this.mapserviceImg, 'alt', this.imageAlt);
                    domAttr.set(this.bannerDataUrl, 'title', this.imageAlt);
                }
            }
        });
    }
);

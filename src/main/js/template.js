/**
 * Setup coverage via istanbul.
 *
 * @author Manuel Leuenberger
 */

var path = require('path');
var istanbul = require('istanbul');

var REPORTER = './node_modules/grunt-template-jasmine-istanbul/src/main/js/reporter.js';
var DEFAULT_TEMPLATE = 'node_modules/grunt-contrib-jasmine/tasks/jasmine/'
		+ 'templates/DefaultRunner.tmpl';

exports.process = function (grunt, task, context) {
	var getRelativeFileList = function () {

		var list = Array.prototype.slice.call(arguments);
		var base = path.resolve('.');
		var files = [];
		list.forEach(function(listItem){
			if (listItem) files = files.concat(grunt.file.expand({nonull: true},listItem));
		});
		return files;
	};


	// prepare reports
	var reports = [];
	if (typeof context.options.report == 'string'
			|| context.options.report instanceof String) {
		reports.push(istanbul.Report.create('html', {
			dir: context.options.report
		}));
	} else if (context.options.report instanceof Array) {
		for (var i = 0; i < context.options.report.length; i++) {
			var report = context.options.report[i];
			reports.push(istanbul.Report.create(report.type, report.options));
		}
	} else {
		reports.push(istanbul.Report.create(context.options.report.type,
				context.options.report.options));
	}
	// prepend coverage reporter
	context.scripts.reporters.unshift(REPORTER);
	// instrument sources
	var instrumenter = new istanbul.Instrumenter();
	var instrumentedSrc = [];
	var filesToInstrument = getRelativeFileList(context.options.filesToInstrument);

	filesToInstrument.forEach(function (src) {
		var tmpSrc = path.join(context.temp, src);
		grunt.file.write(tmpSrc, instrumenter.instrumentSync(
				grunt.file.read(src), src));
		instrumentedSrc.push(tmpSrc);
	});
	context.options.filesToInstrument = instrumentedSrc;
	context.scripts.src = ['main', 'app'];
	// listen to coverage event dispatched by reporter and write reports
	var collector = new istanbul.Collector();
	var coverageJson = context.options.coverage;
	task.phantomjs.on('jasmine.coverage', function (coverage) {
		grunt.file.write(coverageJson, JSON.stringify(coverage));
		collector.add(coverage);
		for (var i = 0; i < reports.length; i++) {
			reports[i].writeReport(collector, true);
		}
	});
	// use template option to mix in coverage
	var template = context.options.template;
	context.options = context.options.templateOptions || {};
	if (!template) {
		template = DEFAULT_TEMPLATE;
	}
	if (template.process) {
		return template.process(grunt, task, context);
	} else {
		return grunt.util._.template(grunt.file.read(template), context);
	}
};

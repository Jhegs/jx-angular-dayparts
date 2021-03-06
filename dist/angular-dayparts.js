angular.module('angular-dayparts', [])
.directive('angularDayparts', ['$window', '$document', '$timeout', function ($window, $document, $timeout) {
    return {
        restrict: 'E',
        scope: {
            options: '=?'
        },
        templateUrl: 'template.html',
        controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {

            $scope.options = $scope.options || {};
            $scope.options.reset = ($scope.options.reset === undefined) ? true : $scope.options.reset;
            $scope.text = ($scope.options.textReset === undefined) ? 'Reset' : $scope.options.textReset;
            $scope.days = loadDays();

            $scope.hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

            var klass = 'selected';
            var startCell = null;
            var isDragging = false;
            var selected = [];
            var isStartSelected = false;


            if ($scope.options.selected) {
                $timeout(function(){
                    repopulate($scope.options.selected);
                }, 100);
            }


            /**
             * Load days
             */
            function loadDays() {
                var days = [{name: 'monday', position: 1, label: 'monday'},
                            {name: 'tuesday', position: 2, label: 'tuesday'},
                            {name: 'wednesday', position: 3, label: 'wednesday'},
                            {name: 'thursday', position: 4, label: 'thursday'},
                            {name: 'friday', position: 5, label: 'friday'},
                            {name: 'saturday', position: 6, label: 'saturday'},
                            {name: 'sunday', position: 7, label: 'sunday'}];
                if($scope.options.labelsDays !== undefined){
                    for(var i = 0; i < days.length; i++) {
                        if($scope.options.labelsDays[i]){
                            days[i].label = $scope.options.labelsDays[i];
                        }
                    }
                }
                return days;
            }

            /**
             * When user stop clicking make the callback with selected elements
             */
            function mouseUp() {
                if (!isDragging) {
                    return;
                }
                isDragging = false;
                onChangeCallback();
            }


            /**
             * Call 'onChange' function from passed options
             */
            function onChangeCallback () {
                if ($scope.options && $scope.options.onChange) {

                    // Sort by day name and time
                    var sortedSelected = [];
                    selected.forEach(function(item){
                        var el = item.split('-');
                        var o = {day: _.find($scope.days, {name: el[0]}), time: parseInt(el[1])};
                        sortedSelected.push(o);
                    });

                    sortedSelected = _.sortBy(_.sortBy(sortedSelected, function(item){
                        return item.time;
                    }), function(item){
                        return item.day.position;
                    });

                    selected = sortedSelected.map(function(item){
                        return item.day.name + '-' + item.time;
                    });

                    $scope.options.onChange(selected);
                }
            }


            /**
             * User start to click
             * @param {jQuery DOM element}
             */
            function mouseDown(el) {
                isDragging = true;
                setStartCell(el);
                setEndCell(el);
            }


            /**
             * User enter in a cell still triggering click
             * @param {jQuery DOM element}
             */
            function mouseEnter(el) {
                if (!isDragging) {
                    return;
                }
                setEndCell(el);
            }


            /**
             * Get the first cell clicked
             * @param {jQuery DOM element}
             */
            function setStartCell(el) {
                startCell = el;
                isStartSelected = _.contains(selected, el.data('time'));
            }


            /**
             * Get the last cell
             * @param {jQuery DOM element}
             */
            function setEndCell(el) {
                cellsBetween(startCell, el).each(function() {
                    var el = angular.element(this);

                    if (!isStartSelected) {
                        if (!_.contains(selected, el.attr('data-time'))) {
                            _addCell(el);
                        }
                    } else {
                        _removeCell(el);
                    }
                });
            }


            /**
             * Get all the cells between first and last
             * @param  {jQuery DOM element} start cell
             * @param  {jQuery DOM element} end cell
             * @return {jQuery DOM elements} cells between start and end
             */
            function cellsBetween(start, end) {
                var coordsStart = getCoords(start);
                var coordsEnd = getCoords(end);
                var topLeft = {
                    column: $window.Math.min(coordsStart.column, coordsEnd.column),
                    row: $window.Math.min(coordsStart.row, coordsEnd.row),
                };
                var bottomRight = {
                    column: $window.Math.max(coordsStart.column, coordsEnd.column),
                    row: $window.Math.max(coordsStart.row, coordsEnd.row),
                };
                return angular.element($element[0].querySelectorAll('td')).filter(function() {
                    var el = angular.element(this);
                    var coords = getCoords(el);
                    return coords.column >= topLeft.column
                        && coords.column <= bottomRight.column
                        && coords.row >= topLeft.row
                        && coords.row <= bottomRight.row;
                });
            }


            /**
             * Get the coordinates of a given cell
             * @param  {jQuery DOM element}
             * @return {object}
             */
            function getCoords(cell) {
                var row = cell.parents('row');
                return {
                    column: cell[0].cellIndex, 
                    row: cell.parent()[0].rowIndex
                };
            }


            /**
             * Passing 'selected' property will make repopulate table
             */
            function repopulate () {
                selected = _.clone($scope.options.selected);
                angular.forEach( angular.element($element[0].querySelectorAll('td')), function(el){
                    if (_.contains(selected, angular.element(el).attr('data-time'))) {
                        angular.element(el).addClass(klass);
                    }
                });
            }


            /**
             * Clicking on a day will select all hours
             * @param  {object} day.name, day.position
             */
            $scope.selectDay = function(day) {
                var numSelectedHours = selected.filter(function(item){
                    return item.split('-')[0] === day.name; 
                }).length;

                angular.forEach( $element.find('table tr:eq(' + day.position + ') td:not(:last-child)'), function(el) {
                    if (numSelectedHours === 24) {
                        _removeCell(angular.element(el));
                    } else if (!_.contains(selected, angular.element(el).data('time'))) {
                        _addCell(angular.element(el));
                    }
                });
                onChangeCallback();
            };


            /**
             * Clicking on a hour will select all days at that hour
             * @param  {int}
             */
            $scope.selectHour = function(hour) {
                hour = hour - 1; // previous selected hour

                var numSelectedDays = $scope.days.filter(function(item){
                    return _.contains(selected, item.name + '-' + hour);
                }).length;

                $scope.days.forEach(function(day, i){
                    angular.forEach( $element.find('table tr:eq(' + (i + 1) + ') td:eq(' + hour + ')'), function(el) {

                        if (numSelectedDays === 7) {
                            _removeCell(angular.element(el));
                        } else if (!_.contains(selected, angular.element(el).data('time'))) {
                            _addCell(angular.element(el));
                        }
                    });
                });
                onChangeCallback();
            };



            /**
             * Remove all selected hours
             */
            $scope.reset = function () {
                selected = [];
                $element.find('td').each(function(i, el){
                    $(el).removeClass(klass);
                });
                onChangeCallback();
            };


            /**
             * Remove css class from table and element from selected array
             * @param  {jQuery DOM element} cell
             */
            function _removeCell (el) {
                el.removeClass(klass);
                selected = _.without(selected, el.data('time'));
            }


            /**
             * Add css class to table and element to selected array
             * @param  {jQuery DOM element} cell
             */
            function _addCell (el) {
                el.addClass(klass);
                selected.push(el.data('time'));
            }


            function wrap(fn) {
                return function() {
                    var el = angular.element(this);
                    $scope.$apply(function() {
                        fn(el);
                    });
                };
            }


            /**
             * Mouse events
             */
            $element.delegate('td:not(:last-child)', 'mousedown', wrap(mouseDown));
            $element.delegate('td:not(:last-child)', 'mouseenter', wrap(mouseEnter));
            $document.delegate('body', 'mouseup', wrap(mouseUp));

        }]
    }
}]);
(function(module) {
try {
  module = angular.module('angular-dayparts');
} catch (e) {
  module = angular.module('angular-dayparts', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('template.html',
    '<div class="dayparts">\n' +
    '\n' +
    '    <table border="0" cellspacing="0" cellpadding="0">\n' +
    '        <tr>\n' +
    '            <th></th>\n' +
    '            <th ng-repeat="hour in hours">\n' +
    '                <a ng-if="!options.disableColumnSelection" ng-click="selectHour(hour)" ng-show="hour !== 0">{{hour}}</a>\n' +
    '                <span ng-if="options.disableColumnSelection">{{hour}}</span>\n' +
    '            </th>\n' +
    '        </tr>\n' +
    '        <tr ng-repeat="day in days">\n' +
    '            <th>\n' +
    '                <a ng-if="!options.disableRowSelection" ng-click="selectDay(day)">{{day.label}}</a>\n' +
    '                <span ng-if="options.disableRowSelection">{{day.label}}</span>\n' +
    '            </th>\n' +
    '            <td ng-repeat="hour in hours" data-time="{{day.name}}-{{hour}}"></td>\n' +
    '        </tr>\n' +
    '    </table>\n' +
    '\n' +
    '    <button type="button" ng-click="reset()" ng-if="options.reset">{{text}}</button>\n' +
    '\n' +
    '</div>');
}]);
})();

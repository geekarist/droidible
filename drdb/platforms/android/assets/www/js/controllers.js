'use strict';

// Don't forget to inject dependencies using $inject
var CaloriesCtrl = function($scope, $http, AuthService) {
	$scope.collectionUrl = collectionsBase + '/' + collection + '?apiKey=' + apiKey;

	$scope.daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	$scope.calories = '';
	$scope.caloriesThisWeek = [];

	$scope.totalCaloriesThisWeek = 0;
	$scope.totalCaloriesLastWeek = 0;

    $scope.chart = {};

    $scope.token = AuthService.storedToken();

    $scope.authenticate = function() {
        $scope.token = AuthService.signIn($scope.login, $scope.password);
    }

    $scope.loadChart = function(onsuccess) {
        $scope.loadTotalByWeek(function(result) {
            var rows = result.map(function(element) {
                return {"c": [{"v": "" + element.num}, {"v": element.total}]}
            })
            var chart = {
              "type": "ColumnChart",
              "cssStyle": "height:200px;width:400px;margin-left: 3rem;",
              "data": {
                "cols": [
                {"id": "week", "label": "Week", "type": "string"},
                {"id": "calories", "label": "Calories", "type": "number"},
                ],
                "rows": rows
                },
                "options": {
                    "title": "Calories by week",
                    "isStacked": "true",
                    "fill": 20,
                    "displayExactValues": true,
                    "vAxis": {"title": "Calories", "gridlines": {"count": 12 } },
                    "hAxis": {"title": "Week number"}
              },
              "formatters": {},
              "displayed": true
            };
            console.log(chart);
            onsuccess(chart);
        });
    }

	$scope.getToday = function() {
		var currentDate = new Date();
		var tzOffset = currentDate.getTimezoneOffset();
		currentDate.setMinutes(currentDate.getMinutes() - currentDate.getTimezoneOffset());
		return currentDate.toISOString();
	}

	$scope.getNineWeeksAgo = function() {
		var currentDate = new Date($scope.getToday());
		currentDate.setDate(currentDate.getDate() - (7*8));
		return currentDate.toISOString();
	}

	$scope.isToday = function(dayOfWeek) {
		var date = new Date($scope.getToday());
		var dayOfWeekForToday = dayofweek(date);
		return dayOfWeek == dayOfWeekForToday;
	}

	var sameday = function(dayStr1, dayStr2) {
		var date1 = new Date(dayStr1);
		var date2 = new Date(dayStr2);
		return date1.getDate() == date2.getDate()
			&& date1.getMonth() == date2.getMonth()
			&& date1.getYear() == date2.getYear();
	}

	$scope.getSelectedDay = function() {
		if ($scope.selectedDay == undefined || sameday($scope.selectedDay, $scope.getToday())) {
			$scope.selectedDay = $scope.getToday();
		}
		return $scope.selectedDay;
	}

	$scope.getLastMonday = function() {
		var date = new Date($scope.getToday());
		return getLastMondayBefore(date);
	}

	$scope.getNextSunday = function() {
		var date = new Date($scope.getToday());
		return getNextSundayAfter(date);
	}

	$scope.getLastMondayForPreviousWeek = function() {
		var date = new Date($scope.getToday());
		date.setDate(date.getDate() - 7);
		return getLastMondayBefore(date);
	}

	$scope.getNextSundayForPreviousWeek = function() {
		var date = new Date($scope.getToday());
		date.setDate(date.getDate() - 7);
		return getNextSundayAfter(date);
	}

	$scope.compute = function(expression) {
		return Parser.parse(expression).evaluate();
	}

	$scope.add = function() {
		var expression = $scope.calories + '+0';
		var caloriesToAdd = $scope.compute(expression);
		var query = {
			date: $scope.getSelectedDay(),
			total: caloriesToAdd
		};
		$http.post(
			$scope.collectionUrl,
			JSON.stringify(query)).success(function(response) {
				$scope.load();
			}).error(function(response) {
			});
	}

	var plusoneday = function(date) {
		var d = new Date(date);
		d.setDate(d.getDate()+1);
		return d.toISOString();
	}

	var buildCaloriesMap = function(data, monday) {
		// Init map
		var tuesday = plusoneday(monday);
		var wednesday = plusoneday(tuesday);
		var thursday = plusoneday(wednesday);
		var friday = plusoneday(thursday);
		var saturday = plusoneday(friday);
		var sunday = plusoneday(saturday);
		var caloriesMap = {
			Monday: {calories: 0, date: monday, selected: false},
			Tuesday: {calories: 0, date: tuesday, selected: false},
			Wednesday: {calories: 0, date: wednesday, selected: false},
			Thursday: {calories: 0, date: thursday, selected: false},
			Friday: {calories: 0, date: friday, selected: false},
			Saturday: {calories: 0, date: saturday, selected: false},
			Sunday: {calories: 0, date: startof(sunday).toISOString(), selected: false},
		}
		// Get each mongo record and add its calories to the map
		for (var i = 0; i < data.length; i++) {
			var date = startof(new Date(data[i].date));
			caloriesMap[dayofweek(date)].calories += data[i].total;
		}
		return caloriesMap;
	}

	var buildCaloriesList = function(caloriesMap) {
		// Create final records to display
		var caloriesList = [];
		for (var day in caloriesMap) {
			var record = {
				day: day,
				date: caloriesMap[day].date,
				total: caloriesMap[day].calories,
				today: $scope.isToday(day),
				selected: $scope.isSelected(caloriesMap[day].date)
			};
			caloriesList.push(record);
		}
		return caloriesList;
	}

	$scope.loadCaloriesByWeek = function(monday, sunday, onsuccess) {
		var query = {
			"date": {
				"$gte": monday,
				"$lte": sunday
			}
		}
		var queryUrl = $scope.collectionUrl +'&q=' + JSON.stringify(query);
		$http.get(queryUrl)
		.success(function(data) {
			var caloriesMap = buildCaloriesMap(data, monday);
			var caloriesList = buildCaloriesList(caloriesMap);
			onsuccess(caloriesList);
		})
		.error(function(response) {
		});
	}

	$scope.isSelected = function(date) {
		var selectedDate = startof(new Date($scope.getSelectedDay())).toISOString();
		var d = startof(new Date(date)).toISOString();
		return selectedDate == d;
	}

	$scope.loadWeek = function(onsuccess) {
		$scope.loadCaloriesByWeek(
			$scope.getLastMonday(),
			$scope.getNextSunday(),
			onsuccess);
	}

	$scope.loadLastWeek = function(onsuccess) {
		$scope.loadCaloriesByWeek(
			$scope.getLastMondayForPreviousWeek(),
			$scope.getNextSundayForPreviousWeek(),
			onsuccess);
	}

	var computeTotal = function(data) {
		var total = 0;
		for (var i = 0; i < data.length; i++) {
			total += data[i].total;
		}
		return total;
	}

	$scope.loadTotalCaloriesForWeek = function(monday, sunday, onsuccess) {
		var query = {
			"date": {
				"$gte": monday,
				"$lte": sunday
			}
		};
		var queryUrl = $scope.collectionUrl +'&q=' + JSON.stringify(query);
		$http.get(queryUrl)
		.success(function(data) {
			var total = computeTotal(data);
			onsuccess(total);
		})
		.error(function(response) {
		});
	}

	$scope.loadWeekTotal = function(onsuccess) {
		$scope.loadTotalCaloriesForWeek(
			$scope.getLastMonday(),
			$scope.getNextSunday(),
			onsuccess);
	}

	$scope.loadLastWeekTotal = function(onsuccess) {
		$scope.loadTotalCaloriesForWeek(
			$scope.getLastMondayForPreviousWeek(),
			$scope.getNextSundayForPreviousWeek(),
			onsuccess);
	}

	var weekNum = function(date) {
    	var onejan = new Date(date.getFullYear(),0,1);
    	return Math.ceil((((date - onejan) / 86400000) + onejan.getDay()+1)/7);
	}

	var isInCurrentWeek = function(date) {
		if (weekNum(date) == weekNum(new Date($scope.getToday()))) {
			return true;
		}
		return false;
	}

	// TODO: Refactor
	var computeTotalByWeek = function(data) {
		var map = {};
		for (var i = 0; i < data.length; i++) {
			var d = data[i];
			var start = getLastMondayBefore(new Date(d.date));
			if (map[start] == undefined) {
				map[start] = {};
				map[start].total = 0;
			}
			map[start].total += data[i].total;
		}
		var list = [];
		for (var weekStart in map) {
			var weekStartDate = new Date(weekStart);
			var weekTotal = {
				num: weekNum(weekStartDate),
				start: weekStartDate.toJSON().split('T')[0].replace(/-/g, '/'),
				total: map[weekStart].total,
				current: isInCurrentWeek(weekStartDate),
			};
			list.push(weekTotal);
		}
		return list;
	}

	$scope.loadTotalByWeek = function(onsuccess) {
		var query = {
			"date": {
				"$gte": getLastMondayBefore(new Date($scope.getNineWeeksAgo())),
				"$lte": getNextSundayAfter(new Date($scope.getToday())),
			}
		};
		var queryUrl = $scope.collectionUrl +'&q=' + JSON.stringify(query);
		$http.get(queryUrl).success(function(data) {
			var result = computeTotalByWeek(data);
			onsuccess(result);
		});
	}

	$scope.loadSelectedDaysMeals = function(onsuccess) {
		var query = {
			"date": {
				"$gte": startof(new Date($scope.getSelectedDay())),
				"$lte": endof(new Date($scope.getSelectedDay())),
			}
		};
		var queryUrl = $scope.collectionUrl +'&q=' + JSON.stringify(query);
		$http.get(queryUrl).success(function(data) {
			var result = [];
			for (var i = 0; i<data.length; i++) {
				var d = data[i].date;
				var tms = d.split('T')[1];
				var ts = tms.split('.')[0];
				result.push({time: ts, calories: data[i].total});
			}
			var finalResult = [];
			result.reverse().forEach(function(val, idx, array) {
				if (idx < 5) {
					finalResult.push(val);
				}
			});
			onsuccess(finalResult);
		});
	}

	$scope.load = function() {
		$scope.loadWeek(function(total) {$scope.caloriesThisWeek = total;});
		$scope.loadLastWeek(function(total) {$scope.caloriesLastWeek = total;});
		$scope.loadWeekTotal(function(total) {$scope.totalCaloriesThisWeek = total;});
		$scope.loadLastWeekTotal(function(total) {$scope.totalCaloriesLastWeek = total;});
		$scope.loadTotalByWeek(function(total) {$scope.totalByWeek = total;});
        $scope.loadSelectedDaysMeals(function(total) {$scope.todaysMeals = total;});
		$scope.loadChart(function(chart) {$scope.chart = chart;});
	}

	$scope.setSelectedDay = function(date) {
		$scope.selectedDay = date;
		$scope.load();
	}

	function dayofweek(date) {
		var dayInt = date.getDay();
		var map = {
			0: 'Sunday',
			1: 'Monday',
			2: 'Tuesday',
			3: 'Wednesday',
			4: 'Thursday',
			5: 'Friday',
			6: 'Saturday'
		}
		return map[dayInt];
	}

	function startof(day) {
		var date = new Date(day);
		date.setHours(1, 0, 0, 0);
		return date;
	}

	function endof(day) {
		var date = startof(day);
		date.setDate(date.getDate()+1);
		date.setHours(0, 59, 59, 999);
		return date;
	}

	function getLastMondayBefore(date) {
		while (date.getDay() != 1) {
			date.setDate(date.getDate() - 1);
		}
		return startof(date).toISOString();
	}

	function getNextSundayAfter(date) {
		while (date.getDay() != 0) {
			date.setDate(date.getDate() + 1);
		}
		return endof(date).toISOString();
	}

}
CaloriesCtrl.$inject = ['$scope', '$http', 'AuthService'];

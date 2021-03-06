(function () {
  'use strict';

  appCivistApp
    .directive('campaignTimeline', CampaignTimeline);

  CampaignTimeline.$inject = ['Campaigns', 'localStorageService'];

  function CampaignTimeline(Campaigns, localStorageService) {

    function loadCampaignComponents(scope, aid, cid) {
      scope.user = localStorageService.get('user');
      var res;
      if (scope.user) {
        res = Campaigns.components(aid, cid,false,null,null);
      } else {
        res = Campaigns.components(null, null,true,cid,null);
      }
      res.then(function (data) {
        var currentComponent = Campaigns.getCurrentComponent(data);
        angular.forEach(data, function (c) {
          c.cssClass = getComponentCssClass(scope, currentComponent, c);
        });
        scope.components = data;
      });
    }

    /**
     * Set timeline stage status.
     *
     * @param currentComponent {Component} the current component.
     * @param c {Component} the timeline component.
     **/
    function getComponentCssClass(scope, currentComponent, c) {
      var idField = scope.user ? 'componentId' : 'uuid';

      if (c[idField] === currentComponent[idField]) {
        return 'active';
      }

      if (c.position < currentComponent.position) {
        return 'inactive';
      }
      return 'future';
    }

    return {
      restrict: 'E',
      scope: {
        assemblyId: '=',
        campaignId: '=',
        title: '@',
        onlyLabel: '='
      },
      templateUrl: '/app/v2/partials/directives/campaign-timeline.html',
      link: function postLink(scope, element, attrs) {

        if (!scope.campaignId) {
          scope.$watch('campaignId', function (cid) {
            loadCampaignComponents(scope, scope.assemblyId, cid);
          });
        } else {
          loadCampaignComponents(scope, scope.assemblyId, scope.campaignId);
        }

        scope.formatDate = function (date) {
          return moment(date, 'YYYY-MM-DD HH:mm').local().format('L');
        };

        scope.toggleMilestoneDescription = function (milestone, milestones) {
          angular.forEach(milestones, function (m) {
            if (milestone.componentMilestoneId !== m.componentMilestoneId) {
              m.showDescription = false;
            }
          });
          milestone.showDescription = !milestone.showDescription;
        };

        scope.clearMilestonesMenu = function (components) {
          angular.forEach(components, function (c) {
            c.isHover = false;
          });
        };

        scope.toggleComponent = function (component, components) {
          var isHover = component.isHover;
          this.clearMilestonesMenu(components);
          component.isHover = !isHover;
        };
      }
    };
  }
} ());

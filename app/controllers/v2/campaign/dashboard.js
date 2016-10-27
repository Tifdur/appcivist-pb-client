(function() {
'use strict';

angular
  .module('appCivistApp')
  .controller('v2.CampaignDashboardCtrl', CampaignDashboardCtrl);


CampaignDashboardCtrl.$inject = [
  '$scope', 'Campaigns', '$stateParams', 'Assemblies', 'Contributions', '$filter',
  'localStorageService', 'FlashService', 'Memberships'
];

function CampaignDashboardCtrl($scope, Campaigns, $stateParams, Assemblies, Contributions,
                               $filter, localStorageService, FlashService, Memberships) {

  activate();

  function activate() {
    $scope.assemblyID = ($stateParams.aid) ? parseInt($stateParams.aid) : 0;
    $scope.campaignID = ($stateParams.cid) ? parseInt($stateParams.cid) : 0;
    $scope.user = localStorageService.get('user');

    loadAssembly();
    loadCampaigns();
    loadWorkingGroups();
    loadAllCampaigns();
  }
  
  function loadAssembly() {
    var rsp = Assemblies.assembly($scope.assemblyID).get();
    rsp.$promise.then(function(data) {
      $scope.assembly = data;
    });
  }
	
  function loadCampaigns() {
    var res = Campaigns.campaign($scope.assemblyID, $scope.campaignID).get();
    res.$promise.then(function(data) {
      $scope.campaign = data;
      $scope.currentComponent = Campaigns.getCurrentComponent($scope.campaign.components);
      angular.forEach(data.components, function(c) {
        c.cssClass = getComponentCssClass(c);
      });

      // get proposals
      getContributions($scope.campaign, 'PROPOSAL').then(function(response) {
        // only published proposals
        $scope.proposals = $filter('filter')(response, {status: 'PUBLISHED', type: 'PROPOSAL'});
        
        if(!$scope.proposals){
          $scope.proposals = [];
        }
      });
      
      // get ideas
      getContributions($scope.campaign, 'IDEA').then(function(response) {
        $scope.ideas = $filter('filter')(response, {type: 'IDEA'});

        if(!$scope.ideas){
          $scope.ideas = [];
        }
      });
      
      // get discussions
      getContributions($scope.campaign, 'DISCUSSION').then(function(response) {
        $scope.discussions = $filter('filter')(response, {type: 'DISCUSSION'});

        if(!$scope.discussions){
          $scope.discussions = [];
        }
      });
    });
  }
	
  function loadWorkingGroups() {
    var rsp = Memberships.workingGroups($scope.user.userId).query();
    rsp.$promise.then(
      function (data) {
        var workingGroups = [];
        angular.forEach(data, function(d) {

          if (d.membershipType === 'GROUP') {
            workingGroups.push(d.workingGroup);
          }
        });
        $scope.workingGroups = workingGroups;
      },
      function (error) {
        FlashService.Error('Error loading user\'s working groups from server');
      }
    );
  }

  function loadAllCampaigns() {
    var rsp = Campaigns.campaigns($scope.user.uuid, 'all').query();
    rsp.$promise.then(
      function(data) {
        $scope.myCampaigns = data;
      },
      function (error) {
        FlashService.Error('Error loading user\'s campaigns from server');
      }
    );
  }

  
  /**
   * Set timeline stage status.
   *
   * @param c {Component} the timeline component.
   **/
  function getComponentCssClass(c) {
    if(c.componentId === $scope.currentComponent.componentId) {
      return 'active';
    }

    if(c.position < $scope.currentComponent.position) {
      return 'inactive';
    }
    return 'future';
  }

  /**
   * Get contributions from server.
   *
   * @param campaign {Campaign} the current campaign.
   * @param type {String} forum_post | comment | idea | question | issue |  proposal | note
   * @return promise
   **/
  function getContributions(campaign, type) {
    // Get list of contributions from server
    // TODO: pass type argument when issue is solved
    // var rsp = Contributions.contributionInResourceSpace(campaign.resourceSpaceId).query({type: type});
    var rsp = Contributions.contributionInResourceSpace(campaign.resourceSpaceId).query();
    rsp.$promise.then(
      function (data) {
        return data;
      },
      function (error) {
        FlashService.Error('Error loading campaign contributions from server');
      }
    );
    return rsp.$promise;
  }

  $scope.formatDate = function(date){
    return moment(date, 'YYYY-MM-DD HH:mm').local().calendar();
  };

  // make discussion reply form visible
  $scope.writeReply = function(discussion) {
    discussion.showReplyForm = true;
  };
}
}());

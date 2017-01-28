(function() {
  'use strict';

  angular
    .module('appCivistApp')
    .controller('v2.ProposalPageCtrl', ProposalPageCtrl);


  ProposalPageCtrl.$inject = [
    '$scope', 'WorkingGroups', '$stateParams', 'Assemblies', 'Contributions', '$filter',
    'localStorageService', 'Memberships', 'Etherpad', 'Notify', '$translate',
    'Space', '$http', 'FileUploader', '$sce'
  ];

  function ProposalPageCtrl($scope, WorkingGroups, $stateParams, Assemblies, Contributions,
    $filter, localStorageService, Memberships, Etherpad, Notify,
    $translate, Space, $http, FileUploader, $sce) {

    activate();

    function activate() {
      $scope.addAttachment = addAttachment.bind($scope);
      $scope.updateFeedback = updateFeedback.bind($scope);
      $scope.uploadFile = uploadFile.bind($scope);
      $scope.createAttachmentResource = createAttachmentResource.bind($scope);
      $scope.activeTab = 'Public';
      $scope.changeActiveTab = function(tab) {
        if (tab == 1) {
          $scope.activeTab = 'Members';
        } else {
          $scope.activeTab = 'Public';
        }
      }
      $scope.isAnonymous = false;
      $scope.userIsMember = false;
      // if the param is uuid then is an anonymous user, use endpoints with uuid
      var pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (pattern.test($stateParams.pid) === true) {
        $scope.proposalID = $stateParams.pid;
        $scope.isAnonymous = true;
      } else {
        $scope.assemblyID = ($stateParams.aid) ? parseInt($stateParams.aid) : localStorageService.get('currentAssembly').assemblyId;
        $scope.groupID = ($stateParams.gid) ? parseInt($stateParams.gid) : 0;
        $scope.proposalID = ($stateParams.pid) ? parseInt($stateParams.pid) : 0;
        $scope.user = localStorageService.get('user');
        if ($scope.user && $scope.user.language) {
          $translate.use($scope.user.language);
          $scope.userName = $scope.user.name;
        }
        // user is member of Assembly
        $scope.userIsMember = true;
      }
      loadProposal($scope);
      $scope.showActionMenu = true;
      $scope.myObject = {};
      $scope.myObject.refreshMenu = function() {
        scope.showActionMenu = !scope.showActionMenu;
      };
      // Read user contribution feedback
      $scope.userFeedback = $scope.userFeedback || { 'up': false, 'down': false, 'fav': false, 'flag': false };
      $scope.toggleIdeasSection = toggleIdeasSection.bind($scope);
      $scope.cm = {
        isHover: false
      };
    }

    // Feedback update
    function updateFeedback(value) {
      //console.log(value);
      if (value === 'up') {
        $scope.userFeedback.up = true;
        $scope.userFeedback.down = false;
      } else if (value === 'down') {
        $scope.userFeedback.up = false;
        $scope.userFeedback.down = true;
      } else if (value === 'fav') {
        $scope.userFeedback.fav = true;
      } else if (value === 'flag') {
        $scope.userFeedback.flag = true;
      }

      //var stats = $scope.contribution.stats;
      var feedback = Contributions.userFeedback($scope.assemblyID, $scope.proposalID).update($scope.userFeedback);
      feedback.$promise.then(
        function(newStats) {
          $scope.proposal.stats = newStats;
          $scope.proposal.informalScore = Contributions.getInformalScore($scope.proposal);
        },
        function(error) {
          Notify.show('Error when updating user feedbac', 'error');
        }
      );
    };

    function loadProposal(scope) {
      var rsp;

      if (scope.isAnonymous) {
        rsp = Contributions.getContributionByUUID(scope.proposalID).get();
      } else {
        rsp = Contributions.contribution(scope.assemblyID, scope.proposalID).get();
      }
      rsp.$promise.then(
        function(data) {
          data.informalScore = Contributions.getInformalScore(data);
          $scope.proposal = data;
          $scope.proposal.frsUUID = data.forumResourceSpaceUUID;
          var workingGroupAuthors = data.workingGroupAuthors;
          var workingGroupAuthorsLength = workingGroupAuthors ? workingGroupAuthors.length : 0;
          $scope.group = workingGroupAuthorsLength ? data.workingGroupAuthors[0] : null;

          if ($scope.group) {
            $scope.group.profilePic = {
              urlAsString: $scope.group.profile.icon
            }
          }

          var campaignIds = data.campaignIds;
          var campaignIdsLength = campaignIds ? campaignIds.length : 0;
          $scope.campaignID = campaignIdsLength ? data.campaignIds[0] : 0;

          if (data.extendedTextPad) {
            $scope.etherpadReadOnlyUrl = Etherpad.embedUrl(data.extendedTextPad.readOnlyPadId, data.publicRevision);
          } else {
            console.warn('Proposal with no PAD associated');
          }

          if (!scope.isAnonymous) {
            verifyAuthorship(scope.proposal);
          }
          loadRelatedContributions();
        },
        function(error) {
          Notify.show('Error occured when trying to load proposal: ' + JSON.stringify(error), 'error');
        }
      );
    }

    function verifyAuthorship(proposal) {
      // Check Authorship
      // 1. Check if user is in the list of authors
      $scope.userIsAuthor = Contributions.verifyAuthorship($scope.user, proposal);

      // 2. If is not in the list of authorships, check if the user is member of one of the responsible groups
      if (!$scope.userIsAuthor && $scope.group && $scope.group.groupId) {
        var authorship = Contributions.verifyGroupAuthorship($scope.user, proposal, $scope.group).get();
        authorship.$promise.then(function(response) {
          $scope.userIsAuthor = response.responseStatus === 'OK';
          if ($scope.userIsAuthor) {
            loadEtherpadWriteUrl(proposal);
          }
        });
      } else if ($scope.userIsAuthor) {
        loadEtherpadWriteUrl(proposal);
      }
    }

    function loadEtherpadWriteUrl(proposal) {
      if (proposal.extendedTextPad) {
        var etherpadRes = Etherpad.getReadWriteUrl($scope.assemblyID, proposal.contributionId).get();
        etherpadRes.$promise.then(function(pad) {
          $scope.etherpadReadWriteUrl = Etherpad.embedUrl(pad.padId);
        });
      }
    }

    function loadRelatedContributions() {
      $scope.proposal.rsUUID = $scope.proposal.resourceSpaceUUID;
      $scope.proposal.rsID = $scope.proposal.resourceSpaceId;
      var rsp = Space.getContributions($scope.proposal, 'IDEA', $scope.isAnonymous);
      rsp.then(
        function(data) {
          var related = [];
          angular.forEach(data.list, function(r) {
            if (r.contributionId === $scope.proposalID) {
              return;
            }
            related.push(r);
          });
          $scope.relatedContributions = related;
        },
        function(error) {
          Notify.show('Error loading contributions from server', 'error');
        }
      );
    }

    function toggleIdeasSection() {
      this.ideasSectionExpanded = !this.ideasSectionExpanded;
    }

    /**
     * Implements add attachment to proposal feature.
     */
    function addAttachment() {
      var vm = this;
      var input = document.createElement('input');
      input.setAttribute('type', 'file');
      $(input).bind('change', function() {
        var file = this.files[0];
        vm.$apply(function() {
          vm.uploadFile(file);
        });
      });
      input.click();
      this.$on('$destroy', function() {
        $(input).unbind('change');
      });
    }

    /**
     * Upload the given file to the server. Also, attachs it to
     * the current contribution.
     *
     * @param {object} file
     */
    function uploadFile(file) {
      var vm = this;
      var fd = new FormData();
      fd.append('file', file);
      $http.post(FileUploader.uploadEndpoint(), fd, {
        headers: {
          'Content-Type': undefined
        },
        transformRequest: angular.identity,
      }).then(function(response) {
        vm.createAttachmentResource(response.data.url);
      }, function(error) {
        Notify.show('Error while uploading file to the server', 'error');
      });
    }

    /**
     * After the file has been uploaded, we should relate it with the contribution.
     *
     * @param {string} url - The uploaded file's url.
     */
    function createAttachmentResource(url) {
      var vm = this;
      var attachment = Contributions.newAttachmentObject({ url: url });
      var rsp = Contributions.contributionAttachment(this.assemblyID, this.proposalID).save(attachment).$promise;
      rsp.then(function(response) {

        if (!vm.proposal.attachment) {
          vm.proposal.attachment = [];
        }
        vm.proposal.attachments.push(response);
      }, function(error) {
        Notify.show('Error while uploading file to the server', 'error');
      });
    }

    function textAsHtml () {
      var vm = this;
      return $sce.trustAsHtml(vm.contribution ? vm.contribution.text : "");
    }

    function textAsHtmlLimited (limit) {
      var vm = this;
      if (vm.contribution && vm.contribution.text) {
        var limitedText = limitToFilter(vm.contribution.text,limit)
        if (vm.contribution.text.length > limit) {
          limitedText+="...";
        }

        vm.trustedHtmlText = $sce.trustAsHtml(limitedText);
      }

      return vm.trustedHtmlText;
    }
  }
}());

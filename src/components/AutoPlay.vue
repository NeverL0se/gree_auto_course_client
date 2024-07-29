<template>
  <div class="container">
    <div class="row justify-content-md-center">
      <div class="col-12 tips">
        <div class="row">
          1. 打开网址并登录：https://jxzh.zh12333.com/zhskillWeb/
        </div>

        <div class="row">
          2. 找到位置：按F12 - 应用 - 存储 / 本地存储空间 / https://jxzh.zh12333.com - 复制： accessToken 和 refreshToken
        </div>
      </div>
    </div>

    <div class="row justify-content-md-center">
      <div class="col-5">
        <b-form @submit="submitToken">
          <b-form-input id="access-token" name="access_token" v-model="token.accessToken"
                        required
                        style="margin-top: 20px;"
                        size="lg"
                        placeholder="粘贴 accessToken"></b-form-input>

          <b-form-input id="refresh-token" name="refresh_token" v-model="token.refreshToken"
                        required
                        style="margin-top: 20px;"
                        size="lg"
                        placeholder="粘贴 refreshToken"></b-form-input>
          <div class="row">
            <button :disabled="btn_disabled" id="btn-x" type="submit" class="btn-x btn btn-primary ">{{
                this.status
              }}
            </button>
          </div>
        </b-form>
      </div>
    </div>

    <div class="row justify-content-md-center">
      <div class="col">
        <hr>
        <table class="table table-hover">
          <thead>
          <tr>
            <th scope="col">课程</th>
            <th scope="col">分P</th>
            <th scope="col">观看进度</th>
            <th scope="col"></th>
            <th scope="col">总时长</th>
            <th scope="col">来源</th>
            <th scope="col"></th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(video, index) in unfinished_videos" :key="index">
            <td>{{ video.course_name }}</td>
            <td>{{ video.sort }}</td>
            <td>
              <div class="progress">
                <div :id="video.courseware_id" class="progress-bar bg-color"
                     role="progressbar" aria-valuemin="0"
                     :aria-valuenow="parseInt(video.duration)"
                     :aria-valuemax="parseInt(video.total_duration)"
                     :style="'width:'+ ((parseInt(video.duration) / parseInt(video.total_duration)) * 100).toFixed(2) +'%'">
                </div>
              </div>
            </td>
            <td>
              {{ secondsToPercentage(video.duration, video.total_duration) }}
            </td>
            <td>{{ secondsToMinutes(video.total_duration) }}</td>
            <td>{{ video.label }}</td>
            <td>
              <div class="spinner-grow  spinner-grow-sm text-success" role="status" v-if="video.show==='1'">
                <span class="visually-hidden">Loading...</span></div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script>
import axios from 'axios';

export default {
  name: 'AutoPlay',
  data() {
    return {
      mode: 'dev',
      current_courseware_id: '',
      unfinished_videos: [],
      token: {
        accessToken: '',
        refreshToken: '',
      },
      status: '一键观看',
      btn_disabled: false
    };
  },

  methods: {
    reset_token() {

      axios.post('https://jxzh.zh12333.com/zhskillApi/api/auth/refreshToken',
        {refreshToken: this.token.refreshToken},
        {
          headers: this.get_post_headers(this.token.accessToken)
        }
      ).then((res) => {

        if (res.status === 200){
          this.token = res.data.data
        }

        console.log(this.token)






      }).catch((error) => {

        if (error.response.status ===401){
        }

        //console.error(error);
      })


    },
    get_post_headers(access_token) {

      return {
        "Accept": "application/json",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        "Authorization": access_token,
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "Pragma": "no-cache",
        "X-Requested-With": "XMLHttpRequest",
      }
    },


    get_url() {
      if (this.mode === 'dev') {
        return 'http://localhost:5000/'
      }
      return '/api/'
    },
    // 获取课程
    submitToken(e) {
      e.preventDefault();


      this.reset_token()
      return


      this.status = '正在解析课程...'
      this.btn_disabled = true

      axios.post(this.get_url() + 'courses', {
        'access_token': this.token.access_token,
        'refresh_token': this.token.refresh_token,
      })
        .then((res) => {
          this.token.access_token = ''
          this.token.refresh_token = ''
          this.unfinished_videos = res.data;
          this.playVideos();

        })
        .catch((error) => {
          // eslint-disable-next-line
          this.status = '一键观看'
          this.btn_disabled = false
          console.error(error);
        });
    },

    // 更新进度
    get_ratio() {
      let progress = setInterval(() => {

        axios.get(this.get_url() + 'ratio')
          .then((res) => {
            let data = res.data

            if ('1' === data['token_expiration']) {
              this.status = '登录过期，刷新页面重来'
              this.btn_disabled = true
              this.unfinished_videos = []
              clearInterval(progress)
              return
            }

            if (1 === data['playing']) {

              let duration = (parseInt(data['duration']))
              let total_duration = (parseInt(data['total_duration']))

              // 纠正播放进度超过时长
              if (duration >= total_duration) {
                duration = total_duration
              }

              let video = this.unfinished_videos.find(e => e['courseware_id'] === data['courseware_id'])

              video['duration'] = duration
              video['total_duration'] = total_duration

              // 播放完成
              if (duration === total_duration && total_duration !== 0 && this.current_courseware_id === data['courseware_id']) {
                this.current_courseware_id = ''
                video['show'] = '0'
              }
            }
          })
          .catch((error) => {
            clearInterval(progress)
            // eslint-disable-next-line
            console.error(error);
          });
      }, 2000)
    },

    // 播放视频
    playVideos() {

      if (this.unfinished_videos.length === 0) {
        this.status = '检查一下是不是粘错了'
        this.btn_disabled = false
        return
      }

      this.status = '开发人员正在后台观看视频...'
      this.btn_disabled = true

      let i = 0
      let interval = setInterval(() => {

        if (i === this.unfinished_videos.length) {
          this.status = '课程已全部完成'
          this.btn_disabled = true
          clearInterval(interval)
          return
        }

        if (this.current_courseware_id === '') {
          axios.post(this.get_url() + 'play', this.unfinished_videos[i])
            .then((res) => {

            })
            .catch((error) => {
              /*this.unfinished_videos = []
              this.status = '一键观看'
              this.btn_disabled = false*/
              console.error(error);
            });
          this.current_courseware_id = this.unfinished_videos[i]['courseware_id']
          this.unfinished_videos[i]['show'] = '1'

          i++
        }
      }, 1000)

      // 开始更新进度
      this.get_ratio()
    },

    secondsToMinutes(seconds) {
      if ('未加载' === seconds) {
        return '未加载'
      }
      let minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
      let secondsLeft = (seconds % 60).toString().padStart(2, '0');
      return `${minutes}:${secondsLeft}`;
    },

    secondsToPercentage(duration, total) {
      if ('未加载' === total) {
        return '未加载'
      }
      return ((parseInt(duration) / parseInt(total)) * 100).toFixed(2) + '%'

    },
  },
  created() {
  },
};
</script>

<style>
.form-control-lg {
  color: #183153;
  font-size: 16px;
  border-color: #616D8A;
  border-style: solid;
  border-width: 2px;
}

.banner {
  font-weight: bold;
  border-color: #DFE1E7;
  background-color: white;
  border-radius: .5rem;
  color: #ffffff;
  padding: 25px;
  margin-top: 10px;
  padding: 2%;
  border-style: solid;
}

.tips {
  margin-block-start: -16px;
  font-weight: 700;
  font-size: 18.2px;
  line-height: 1.8;
  padding-left: 28px;
  background-color: #f36944;
  border-radius: .5rem;
  color: white;
  padding-top: 10px;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

td {
  align-content: center;
}

.bg-color {
  background-color: #183153;
}

#btn-x {
  height: 59px;
  margin-top: 50px;
  margin-bottom: 30px;
  background-color: #ffffff;
  color: #001e42;
  cursor: pointer;
  border-radius: .5rem;
  border: 2px solid #001e42;
  box-shadow: 0 .385rem 0 #001e42;
  text-decoration: none;
  padding: .75rem 1.25rem;
  font-weight: 600;
  transition: all .15s ease-in-out;
}

#btn-x:hover {
  background-color: #c3c6d0;
  border: 2px solid #001e42;
}

#btn-x:active {
  box-shadow: none;
  background-color: #c3c6d0;
  transform: translateY(6px);
}
</style>
